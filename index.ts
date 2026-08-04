#!/usr/bin/env bun
import { Command } from "commander";
import { runWakeup } from "./tui/wakeup";

const program = new Command();

program.name("orey").description("Only a CLI for now").version("0.0.1", "-v, --version", "output the current version");

program
  .command("wakeup")
  .description("Show the title banner and pick cli or telegram mode")
  .action(async () => {
    await runWakeup();
  });

await program.parseAsync(process.argv);
