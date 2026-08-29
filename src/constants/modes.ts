import type { ModeOption } from "@/types";

export const MODES: ModeOption[] = [
  {
    id: "agent",
    name: "Agent Mode",
    description: "Autonomous agent that reads, edits files, and executes commands",
  },
  {
    id: "plan",
    name: "Plan Mode",
    description: "Generates clear, structured task execution steps",
  },
  {
    id: "ask",
    name: "Ask Mode",
    description: "Read-only codebase intelligence and question answering",
  },
];