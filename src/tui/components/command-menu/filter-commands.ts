import { COMMANDS } from "./commands";
import type { Command } from "@/types/command";

export function filterCommands(query: string): Command[] {
  const cleanQuery = query.startsWith("/") ? query.slice(1) : query;
  if (!cleanQuery) return COMMANDS;

  const lower = cleanQuery.toLowerCase();
  return COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().startsWith(lower) ||
      cmd.description.toLowerCase().includes(lower),
  );
}

