#!/usr/bin/env bun

const args = process.argv.slice(2);
const argsLower = args.map((arg) => arg.toLowerCase());
if (argsLower.includes("--version") || argsLower.includes("-v")) {
  console.log(`Orey 0.1.0`);
} else if (argsLower.includes("--help") || argsLower.includes("-h")) {
  console.log(`Orey 0.1.0

Usage:
  orey [options]

Options:
  -h, --help       Show this help message
  -v, --version    Show the installed Orey version
`);
} else if (args.length > 0) {
  console.error(`Unknown option: ${args[0]}\nRun 'orey --help' for usage.`);
  process.exit(1);
} else {
  const { createElement } = await import("react");
  const { createCliRenderer } = await import("@opentui/core");
  const { createRoot } = await import("@opentui/react");
  const { App } = await import("./tui/app.tsx");

  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 60,
  });
  createRoot(renderer).render(createElement(App));
}
