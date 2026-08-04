import chalk from "chalk";
import { select, isCancel } from "@clack/prompts";
import { runAgentMode } from "./agent/orchestrator";
import { runAskMode } from "./ask/orchestrator";

export async function runCliMode() {
  while (true) {
    const mode = await select({
      message: "CLI Mode: Choose an option",
      options: [
        { value: "agent", label: "Agent Mode" },
        { value: "plan", label: "Plan Mode" },
        { value: "ask", label: "Ask Mode" },
        { value: "back", label: "← Back to main menu" },
      ],
    });

    if (isCancel(mode) || mode === "back") return;

    if (mode === "agent") {
      await runAgentMode();
    } else if (mode === "ask") {
      await runAskMode();
    } else if (mode === "plan") {
      console.log(chalk.green("You selected Plan Mode."));
      // Add your Plan Mode logic here
    }

    if (mode !== "agent" && mode !== "plan" && mode !== "ask") {
      console.log(
        chalk.yellow(
          "\n This mode is not implemented yet. Please select another option.\n",
        ),
      );
    }
  }
}
