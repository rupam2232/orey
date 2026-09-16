import { COMMANDS } from "./commands";
import type { Command } from "@/types/command";

export function filterCommands(query: string): Command[] {
  const cleanQuery = query.startsWith("/") ? query.slice(1) : query;
  if (!cleanQuery) return COMMANDS;

  const lower = cleanQuery.toLowerCase();
  const result = COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().startsWith(lower) ||
      cmd.description.toLowerCase().includes(lower),
  );
  result.sort((a, b)=> {
    const aStarts = a.name.toLowerCase().startsWith(lower);
    const bStarts = b.name.toLowerCase().startsWith(lower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  })
  return result;
}

