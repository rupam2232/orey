import type { Command } from "@/types/command";
import {
  AgentsDialogContent,
  SessionsDialogContent,
} from "../dialogs";

export const COMMANDS: Command[] = [
  {
    name: "new",
    description: "Start a new conversation",
    value: "/new",
    action: (ctx) => {
      ctx.navigate("/");
    },
  },
  {
    name: "agents",
    description: "Switch agent/mode",
    value: "/agents",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Agent",
        children: (
          <AgentsDialogContent
            currentMode={ctx.mode}
            onSelectMode={ctx.setMode}
          />
        ),
      });
    },
  },
  {
    name: "sessions",
    description: "Browse past local sessions",
    value: "/sessions",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Past Sessions",
        children: <SessionsDialogContent />,
      });
    },
  },
  {
    name: "exit",
    description: "Quit the application",
    value: "/exit",
    action: (ctx) => {
      ctx.exit();
    },
  },
];

