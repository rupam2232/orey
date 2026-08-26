import { useMemo, useState } from "react";
import { TextAttributes } from "@opentui/core";
import type { SelectOption } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ActionLog } from "@/modes/agent/types";
import {
  groupPendingActions,
  type ReviewGroup,
} from "@/modes/agent/diff-view";

type Props = {
  pending: ActionLog[];
  onComplete: (approvedActionIds: string[]) => void;
};

const FILETYPE_BY_EXT: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".json": "json",
  ".md": "markdown",
  ".css": "css",
  ".html": "html",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
};

function filetypeFor(group: ReviewGroup): string | undefined {
  const p = group.path;
  if (!p) return undefined;
  const dot = p.lastIndexOf(".");
  if (dot < 0) return undefined;
  return FILETYPE_BY_EXT[p.slice(dot).toLowerCase()];
}

export function ApprovalCard({ pending, onComplete }: Props) {
  const groups = useMemo(() => groupPendingActions(pending), [pending]);

  const [phase, setPhase] = useState<"summary" | "review">("summary");
  const [index, setIndex] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
  const [decisions, setDecisions] = useState<Map<number, boolean>>(new Map());

  const current = groups[index];
  const decided = (i: number) => decisions.get(i);

  const finish = (approved: number[]) => {
    const ids = approved.flatMap((i) => groups[i]?.actionIds ?? []);
    onComplete(ids);
  };

  const approveAll = () => finish(groups.map((_, i) => i));

  const rejectAll = () => finish([]);

  const decideCurrent = (approved: boolean) => {
    if (!current) return;
    const next = new Map(decisions);
    next.set(index, approved);
    setDecisions(next);
    setShowDiff(false);
    if (index + 1 < groups.length) {
      setIndex(index + 1);
    } else {
      finish([...next.entries()].filter(([, ok]) => ok).map(([i]) => i));
    }
  };

  useKeyboard((key) => {
    if (key.name === "escape" && showDiff) {
      key.preventDefault();
      setShowDiff(false);
    }
  });

  const summaryOptions: SelectOption[] = [
    { name: `Approve all (${pending.length} change(s))`, description: "", value: "all" },
    { name: "Review one by one", description: "", value: "review" },
    { name: "Reject all", description: "", value: "reject" },
  ];

  const reviewOptions: SelectOption[] = [
    { name: `Accept ${current?.label ?? ""}`, description: "", value: "accept" },
    {
      name: showDiff ? "Hide diff" : "Show diff",
      description: current?.patch ? "" : "(no diff available)",
      value: "diff",
    },
    { name: `Reject ${current?.label ?? ""}`, description: "", value: "reject" },
  ];

  return (
    <box
      width="100%"
      flexDirection="column"
      border
      borderColor="#d97706"
      padding={1}
      gap={1}
      marginTop={1}
      title="Review staged changes"
    >
      {phase === "summary" ? (
        <>
          {groups.map((g, i) => (
            <text key={g.label + i} width="100%">
              {"  • "}
              {g.label}
            </text>
          ))}
          <select
            focused
            width="100%"
            options={summaryOptions}
            showDescription={false}
            onSelect={(_, option) => {
              if (option?.value === "all") approveAll();
              else if (option?.value === "review") setPhase("review");
              else rejectAll();
            }}
          />
        </>
      ) : (
        <>
          <box flexDirection="column" width="100%" paddingLeft={1}>
            {groups.map((g, i) => {
              const d = decided(i);
              const mark =
                d === true ? "✅" : d === false ? "❌" : i === index ? "▶️" : "⬜";
              return (
                <text
                  key={g.label + i}
                  width="100%"
                  attributes={d != null ? TextAttributes.DIM : undefined}
                >
                  {mark} {g.label}
                </text>
              );
            })}
          </box>
          {showDiff && current?.patch ? (
            <scrollbox height={14} width="100%">
              <diff
                diff={current.patch}
                filetype={filetypeFor(current)}
                wrapMode="none"
                showLineNumbers
                width="100%"
              />
            </scrollbox>
          ) : null}
          <select
            focused
            width="100%"
            options={reviewOptions}
            showDescription={false}
            onSelect={(_, option) => {
              if (option?.value === "accept") decideCurrent(true);
              else if (option?.value === "diff") setShowDiff(!showDiff);
              else decideCurrent(false);
            }}
          />
        </>
      )}
    </box>
  );
}
