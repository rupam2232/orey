import { createTwoFilesPatch } from "diff";
import type { ActionLog } from "../ai/types";

export interface ReviewGroup {
  label: string;
  path: string | null;
  kind: "folder" | "file" | "shell";
  actionIds: string[];
  patch: string | null;
}

export function groupPendingActions(pending: ActionLog[]): ReviewGroup[] {
  const byPath = new Map<string, ActionLog[]>();
  const shells: ActionLog[] = [];

  for (const a of pending) {
    if (a.type === "tool_execute") {
      shells.push(a);
      continue;
    }
    const key = a.path;
    if (!byPath.has(key)) byPath.set(key, []);
    byPath.get(key)!.push(a);
  }

  const groups: ReviewGroup[] = [];

  const pathEntries = [...byPath.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [p, acts] of pathEntries) {
    const sorted = acts.sort(
      (x, y) => x.timestamp.getTime() - y.timestamp.getTime(),
    );
    const ids = sorted.map((x) => x.id);

    if (sorted.every((x) => x.type === "folder_create")) {
      groups.push({
        label: `Create folder: ${p}`,
        path: p,
        kind: "folder",
        actionIds: ids,
        patch: null,
      });
      continue;
    }

    const { before, after } = composeBeforeAfter(sorted);
    const patch = formatPatch(p, before, after);
    const kinds = [...new Set(sorted.map((x) => x.type))].join(", ");
    groups.push({
      label: `${p} (${kinds})`,
      path: p,
      kind: "file",
      actionIds: ids,
      patch,
    });
  }

  for (const s of shells) {
    groups.push({
      label: `Shell: ${s.details.command ?? "(no command)"}`,
      path: null,
      kind: "shell",
      actionIds: [s.id],
      patch: null,
    });
  }

  return groups;
}

export function formatPatch(
  filePath: string,
  before: string,
  after: string,
): string {
  return createTwoFilesPatch(filePath, filePath, before, after, "", "", {
    context: 3,
  });
}

export function composeBeforeAfter(sorted: ActionLog[]): {
  before: string;
  after: string;
} {
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (last.type === "file_delete")
    return { before: last.details.before ?? "", after: "" };
  const before =
    first.type === "file_create" ? "" : (first.details.before ?? "");
  const after = last.details.after ?? "";
  return { before, after };
}
