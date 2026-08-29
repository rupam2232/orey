import { TextAttributes } from "@opentui/core";
import { usePromptConfig } from "../providers/prompt-config";

export function StatusBar() {
  const { mode, model } = usePromptConfig();

  const modeLabel =
    mode === "plan" ? "Plan" : mode === "ask" ? "Ask" : "Agent";

  return (
    <box flexDirection="row" gap={1}>
      <text>{modeLabel}</text>
      <text attributes={TextAttributes.DIM}>
        ›
      </text>
      <text attributes={TextAttributes.DIM}>{model}</text>
    </box>
  );
}
