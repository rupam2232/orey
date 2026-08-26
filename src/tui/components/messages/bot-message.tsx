import { TextAttributes } from "@opentui/core";
import type { ModeType } from "../../../types";
import { Markdown } from "../markdown";

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: unknown;
      state: "call" | "output-available" | "output-error";
      output?: unknown;
      errorText?: string;
    };

type Props = {
  parts: MessagePart[];
  model: string;
  mode: ModeType;
  durationMs?: number;
  streaming?: boolean;
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSecs}s`;
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatToolArgs(tc: Extract<MessagePart, { type: "tool-call" }>): string {
  if (!tc.args || typeof tc.args !== "object") return String(tc.args ?? "");
  const entries = Object.entries(tc.args as Record<string, unknown>);
  return entries
    .map(([key, value]) => {
      const valStr = typeof value === "string" ? value : JSON.stringify(value);
      return entries.length === 1 ? valStr : `${key}: ${valStr}`;
    })
    .join(" ");
}

type PartGroup = {
  type: MessagePart["type"];
  parts: MessagePart[];
  key: string;
};

function groupConsecutiveParts(parts: MessagePart[]): PartGroup[] {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.type === part.type && part.type !== "tool-call") {
      lastGroup.parts.push(part);
    } else {
      const key =
        part.type === "tool-call"
          ? `group-tc-${part.toolCallId}`
          : `group-${part.type}-${i}`;
      groups.push({ type: part.type, parts: [part], key });
    }
  }

  return groups;
}

export function BotMessage({
  parts,
  model,
  mode,
  durationMs,
  streaming = false,
}: Props) {

  const modeLabel =
    mode === "plan" ? "Plan" : mode === "ask" ? "Ask" : "Agent";

  return (
    <box width="100%" alignItems="center" paddingBottom={1}>
      {groupConsecutiveParts(parts).map((group, i) => (
        <box key={group.key} width="100%" paddingTop={i === 0 ? 0 : 1}>
          {group.parts.map((part, j) => {
            if (part.type === "reasoning") {
              return (
                <box
                  key={`reasoning-${j}`}
                  border={["left"]}
                  width="100%"
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em>Thinking:</em> {part.text}
                  </text>
                </box>
              );
            }

            if (part.type === "tool-call") {
              const toolName = part.toolName;
              return (
                <box
                  key={part.toolCallId}
                  border={["left"]}
                  width="100%"
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em>{formatToolName(toolName)}</em>:{" "}
                    {formatToolArgs(part)}
                    {part.state === "call" ? "..." : ""}
                    {part.state === "output-error"
                      ? ` (failed: ${part.errorText})`
                      : ""}
                  </text>
                </box>
              );
            }

            if (part.type === "text") {
              return (
                <box key={`text-${j}`} paddingX={2} width="100%">
                  <Markdown content={part.text} streaming={streaming} />
                </box>
              );
            }

            return null;
          })}
        </box>
      ))}

      {(!streaming || durationMs != null) && (
        <box paddingX={2} paddingTop={1} gap={1} width="100%">
          <box flexDirection="row" gap={2}>
            <text>◉</text>
            <box flexDirection="row" gap={1}>
              <text>{modeLabel}</text>
              <text attributes={TextAttributes.DIM}>
                |
              </text>
              <text attributes={TextAttributes.DIM}>{model}</text>
              {durationMs != null && (
                <>
                  <text
                    attributes={TextAttributes.DIM}
                  >
                    |
                  </text>
                  <text attributes={TextAttributes.DIM}>
                    {formatDuration(durationMs)}
                  </text>
                </>
              )}
            </box>
          </box>
        </box>
      )}
    </box>
  );
}
