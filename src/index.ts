#!/usr/bin/env bun

import { createElement } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./tui/app.tsx";

declare const OREY_VERSION: string | undefined;
const version = typeof OREY_VERSION === "string" ? OREY_VERSION : "dev";

const args = process.argv.slice(2);
const argsLower = args.map((arg) => arg.toLowerCase());
if (argsLower.includes("--version") || argsLower.includes("-v")) {
  console.log(`Orey ${version}`);
} else if (argsLower.includes("--help") || argsLower.includes("-h")) {
  console.log(`Orey ${version}

Usage:
  orey

Options:
  -h, --help       Show this help message
  -v, --version    Show the installed Orey version
`);
} else if (args.length > 0) {
  console.error(`Unknown option: ${args[0]}\nRun 'orey --help' for usage.`);
  process.exit(1);
} else {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 60,
  });
  createRoot(renderer).render(createElement(App));
}
