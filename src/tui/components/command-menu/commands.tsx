import type { Command } from "@/types/command";
import {
  AgentsDialogContent,
  ModelsDialogContent,
  SessionsDialogContent,
  WebDialogContent,
} from "../dialogs";

export const COMMANDS: Command[] = [
  {
    name: "new",
    description: "Start a new session",
    value: "/new",
    action: (ctx) => {
      ctx.navigate("/");
    },
  },
  {
    name: "modes",
    description: "Switch modes",
    value: "/modes",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Mode",
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
      });
    },
  },
  {
    name: "web",
    description: "Configure web search / Firecrawl API",
    value: "/web",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Web Access Settings",
        children: <WebDialogContent />,
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

