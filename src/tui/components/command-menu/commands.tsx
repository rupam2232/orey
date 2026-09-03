import type { Command } from "@/types/command";
import {
  AgentsDialogContent,
  ModelsDialogContent,
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
    name: "models",
    description: "Choose a model (provider + api key)",
    value: "/models",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Model",
        children: <ModelsDialogContent onSelectModel={() => {}} />,
        size: "fullscreen",
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

