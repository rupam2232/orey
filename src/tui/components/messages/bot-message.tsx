import { useEffect, useMemo, useRef, useState } from "react";
import { TextAttributes } from "@opentui/core";
import type { BoxRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ModeType, MessagePart } from "@/types";
import { Markdown } from "../markdown";

const WIDE_CHAR_RANGES =
  "\u1100-\u115F" +
  "\u2E80-\u303E" +
  "\u3041-\u33FF" +
  "\u3400-\u4DBF" +
  "\u4E00-\u9FFF" +
  "\uA000-\uA4CF" +
  "\uAC00-\uD7A3" +
  "\uF900-\uFAFF" +
  "\uFE30-\uFE4F" +
  "\uFF00-\uFF60" +
  "\uFFE0-\uFFE6";
const WIDE_CHARS = new RegExp(`[${WIDE_CHAR_RANGES}]`, "g");

function cellWidth(s: string): number {
  return s.length + (s.match(WIDE_CHARS)?.length ?? 0);
}

function endTruncate(s: string, maxCells: number): string {
  if (maxCells <= 0) return "";
  if (cellWidth(s) <= maxCells) return s;
  const target = maxCells - 1;
  let out = "";
  let w = 0;
  for (const ch of s) {
    const chW = cellWidth(ch);
    if (w + chW > target) break;
    out += ch;
    w += chW;
  }
  return out + "…";
}

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

function joinReasoningText(parts: MessagePart[]): string {
  let out = "";
  for (const p of parts) {
    if (p.type === "reasoning") out += p.text;
  }
  return out;
}

function ReasoningToggle({
  text,
  isExpanded,
  onToggle,
}: {
  text: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { width: terminalWidth } = useTerminalDimensions();
  const boxRef = useRef<BoxRenderable | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useEffect(() => {
    const w = boxRef.current?.width;
    if (w && w !== measuredWidth) {
      setMeasuredWidth(w);
    }
  });

  if (isExpanded) {
    return (
      <box
        ref={boxRef}
        width="100%"
        paddingX={2}
        onMouseDown={onToggle}
      >
        <text>
          <em>- Thinking:</em> <span attributes={TextAttributes.DIM}>{text}</span>
        </text>
      </box>
    );
  }

  const firstLine = text.split("\n", 1)[0] ?? "";
  const prefix = "+ Thinking: ";
  const chromeFallback = 8;
  const widthBudget =
    measuredWidth != null
      ? Math.min(measuredWidth, terminalWidth)
      : terminalWidth - chromeFallback;
  const available = Math.max(0, widthBudget - 4 - cellWidth(prefix));
  const truncated = endTruncate(firstLine, available);

  return (
    <box
      ref={boxRef}
      width="100%"
      paddingX={2}
      onMouseDown={onToggle}
    >
      <text wrapMode="none" attributes={TextAttributes.DIM}>
        <em>{prefix}</em>
        {truncated}
      </text>
    </box>
  );
}

type Props = {
  parts: MessagePart[];
  model: string;
  mode: ModeType;
  durationMs?: number;
  streaming?: boolean;
};

export function BotMessage({
  parts,
  model,
  mode,
  durationMs,
  streaming = false,
}: Props) {
  const modeLabel =
    mode === "plan" ? "Plan" : mode === "ask" ? "Ask" : "Agent";

  useTerminalDimensions();

  const [manuallyExpanded, setManuallyExpanded] = useState<Set<number>>(
    () => new Set(),
  );

  const groups = useMemo(() => groupConsecutiveParts(parts), [parts]);

  const lastIndex = groups.length - 1;
  const activeStreamingGroupIndex =
    streaming && lastIndex >= 0 && groups[lastIndex]?.type === "reasoning"
      ? lastIndex
      : null;

  function toggleExpanded(i: number) {
    setManuallyExpanded((current) => {
      const next = new Set(current);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <box width="100%" alignItems="center" paddingBottom={1}>
      {groups.map((group, i) => (
        <box key={group.key} width="100%" paddingTop={i === 0 ? 0 : 1}>
          {group.type === "reasoning" ? (
            <ReasoningToggle
              text={joinReasoningText(group.parts)}
              isExpanded={
                i === activeStreamingGroupIndex || manuallyExpanded.has(i)
              }
              onToggle={() => toggleExpanded(i)}
            />
          ) : group.parts.map((part, j) => {
            if (part.type === "tool-call") {
              const toolName = part.toolName;
              return (
                <box
                  key={part.toolCallId}
                  width="100%"
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em>{formatToolName(toolName)}</em>:{" "}
                    <span attributes={part.state === "call" ? TextAttributes.BLINK : undefined}>
                      {formatToolArgs(part)}
                      {part.state === "call" ? "..." : ""}
                    </span>
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
            <text attributes={streaming ? TextAttributes.BLINK : undefined}>◉</text>
            <box flexDirection="row" gap={1}>
              <text>{modeLabel}</text>
              <text attributes={TextAttributes.DIM}>
                |
              </text>
              <text attributes={TextAttributes.DIM}>{model}</text>
              {durationMs != null && !streaming && (
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
