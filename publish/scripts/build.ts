#!/usr/bin/env bun

import { $ } from "bun"
import path from "node:path"
import rootPkg from "../../package.json"

const rootDir = path.resolve(import.meta.dirname, "../..");
process.chdir(rootDir)


const singleFlag = process.argv.includes("--single")
const baselineFlag = process.argv.includes("--baseline")
const muslFlag = process.argv.includes("--musl")
const sourcemapsFlag = process.argv.includes("--sourcemaps")

const allTargets = [
  { os: "linux", arch: "x64" },
  { os: "linux", arch: "arm64" },
  { os: "linux", arch: "x64", musl: true },
  { os: "linux", arch: "arm64", musl: true },
  { os: "linux", arch: "x64", avx2: false },
  { os: "linux", arch: "x64", avx2: false, musl: true },
  { os: "darwin", arch: "x64" },
  { os: "darwin", arch: "arm64" },
  { os: "darwin", arch: "x64", avx2: false },
  { os: "win32", arch: "x64" },
  { os: "win32", arch: "arm64" },
  { os: "win32", arch: "x64", avx2: false },
]

const targets = singleFlag
  ? allTargets.filter((item) => {
      if (item.os !== process.platform || item.arch !== process.arch) return false
      if (item.avx2 === false) return baselineFlag
      if (item.musl && !muslFlag) return false
      if (!item.musl && muslFlag) return false
      return true
    })
  : allTargets

const binaries: Record<string, string> = {}

for (const item of targets) {
  const name = [
    rootPkg.name,
    item.os === "win32" ? "windows" : item.os,
    item.arch,
    item.avx2 === false ? "baseline" : undefined,
    item.musl ? "musl" : undefined,
  ]
    .filter(Boolean)
    .join("-")

  console.log(`building ${name}`)
  const baseBinaryPath = `dist/binaries/${name}`
  await $`mkdir -p ${baseBinaryPath}/bin`

  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    format: "esm",
    minify: true,
    sourcemap: sourcemapsFlag ? "linked" : "none",
    splitting: true,
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      autoloadTsconfig: true,
      autoloadPackageJson: true,
      target: name.replace(rootPkg.name, "bun") as Bun.Build.CompileTarget,
      outfile: `${baseBinaryPath}/bin/orey`,
      execArgv: [`--user-agent=orey/${rootPkg.version}`],
      windows: {},
    },
    define: {
      OREY_VERSION: `'${rootPkg.version}'`,
    },
  })

  if (!result.success) {
    for (const log of result.logs) console.error(log)
    process.exit(1)
  }

  if (item.os === process.platform && item.arch === process.arch && !item.musl && item.avx2 !== false) {
    const binaryPath = `${baseBinaryPath}/bin/orey`
    console.log(`Smoke test: ${binaryPath} --version`)
    try {
      const v = await $`${binaryPath} --version`.text()
      console.log(`Passed: ${v.trim()}`)
    } catch (e) {
      console.error(`Failed for ${name}:`, e)
      process.exit(1)
    }
  }

  await Bun.file(`${baseBinaryPath}/package.json`).write(
    JSON.stringify({
      name,
      version: rootPkg.version,
      repository: rootPkg.repository,
      preferUnplugged: true,
      os: [item.os],
      cpu: [item.arch],
      ...(item.musl ? { libc: ["musl"] } : {}),
    }, null, 2),
  )

  binaries[name] = rootPkg.version

  if (process.env.RELEASE === "true") {
    if (item.os === "linux") {
      await $`tar -czf ../../${name}.tar.gz *`.cwd(`${baseBinaryPath}/bin`)
    } else {
      await $`zip -r ../../${name}.zip *`.cwd(`${baseBinaryPath}/bin`)
    }
  }
}

console.log("Built:", Object.keys(binaries))
