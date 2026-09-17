#!/usr/bin/env bun

import { $ } from "bun"
import path from "path"
import rootPkg from "../../package.json"

const rootDir = path.resolve(import.meta.dirname, "../..");
process.chdir(rootDir)

const channel = process.env.PUBLISH_CHANNEL || "latest"
const publishBinaries = process.env.PUBLISH_BINARIES !== "false"
const publishMain = process.env.PUBLISH_MAIN !== "false"
const dryRun = process.env.PUBLISH_DRY_RUN === "true"

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version --silent`.nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(dir)
  if (!dryRun && await published(name, version)) {
    console.log(`already published ${name}@${version}`)
    return
  }
  await $`bun pm pack`.cwd(dir)
  if (dryRun) {
    await $`npm publish *.tgz --access public --dry-run --tag ${channel}`.cwd(dir)
  } else {
    await $`npm publish *.tgz --access public --provenance --tag ${channel}`.cwd(dir)
  }
}

const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("dist/binaries/*/package.json").scanSync({ cwd: "." })) {
  const pkg = await Bun.file(filepath).json()
  binaries[pkg.name] = pkg.version
}
console.log("binaries", binaries)

const publishedName = rootPkg.name + "-ai"

await $`mkdir -p ./dist/${publishedName}/bin`
await $`cp ./publish/scripts/postinstall.mjs ./dist/${publishedName}/postinstall.mjs`
await Bun.file(`./dist/${publishedName}/LICENSE`).write(await Bun.file("./LICENSE").text().catch(() => (rootPkg.license || "MIT")))
await Bun.file(`./dist/${publishedName}/README.md`).write(await Bun.file("./README.md").text().catch(() => ""))
await Bun.file(`./dist/${publishedName}/bin/${rootPkg.name}.exe`).write(
  [
    `echo "Error: ${publishedName}'s postinstall script was not run." >&2`,
    'echo "" >&2',
    'echo "This occurs when using --ignore-scripts during installation, or when using a" >&2',
    'echo "package manager like pnpm that does not run postinstall scripts by default." >&2',
    'echo "" >&2',
    'echo "To fix this, run the postinstall script manually:" >&2',
    `echo "cd node_modules/${publishedName} && node postinstall.mjs" >&2`,
    'echo "" >&2',
    'echo "Or reinstall orey-ai without the --ignore-scripts flag." >&2',
    "exit 1",
    "",
  ].join("\n"),
)

const generatedPkg = {
  ...rootPkg,
  name: publishedName,
  bin: { [rootPkg.name]: `./bin/${rootPkg.name}.exe` },
  scripts: { postinstall: "node ./postinstall.mjs" },
  os: ["darwin", "linux", "win32"],
  cpu: ["arm64", "x64"],
  optionalDependencies: binaries,
}

// Remove fields that shouldn't be in published CLI package
if (generatedPkg.private) delete (generatedPkg as Partial<typeof generatedPkg>).private
if (generatedPkg.devDependencies) delete (generatedPkg as Partial<typeof generatedPkg>).devDependencies
if (generatedPkg.dependencies) delete (generatedPkg as Partial<typeof generatedPkg>).dependencies
if (generatedPkg.peerDependencies) delete (generatedPkg as Partial<typeof generatedPkg>).peerDependencies

await Bun.file(`./dist/${publishedName}/package.json`).write(JSON.stringify(generatedPkg, null, 2))

if (publishBinaries) {
  for (const [name, version] of Object.entries(binaries)) {
    await publish(`./dist/binaries/${name}`, name, version)
  }
}

if (publishMain) {
  await publish(`./dist/${publishedName}`, publishedName, rootPkg.version)
}
