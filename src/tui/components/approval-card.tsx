import { TextAttributes } from "@opentui/core";
import type { SelectOption } from "@opentui/core";
import { useDialog } from "@/tui/providers/dialog";
import type { PendingToolApproval } from "@/ai/tool-approval";
import { useTheme } from "@/tui/providers/theme";

type Props = {
  approval: PendingToolApproval;
  queuedCount: number;
  onDecision: (approved: boolean) => void;
};

function ApprovalDetails({ approval }: { approval: PendingToolApproval }) {
  const isShell = approval.toolName === "execute_shell";

  return (
    <box flexDirection="column" gap={1}>
      {isShell ? (
        <>
          <text attributes={TextAttributes.BOLD}>Working directory</text>
          <text>{approval.cwd}</text>
          <text attributes={TextAttributes.BOLD}>Command</text>
          <scrollbox height={12} width="100%">
            <text>{approval.command}</text>
          </scrollbox>
        </>
      ) : (
        <>
          <text attributes={TextAttributes.BOLD}>URL</text>
          <scrollbox height={8} width="100%">
            <text>{approval.url}</text>
          </scrollbox>
          <text attributes={TextAttributes.BOLD}>HTTP method</text>
          <text>{approval.method}</text>
        </>
      )}
    </box>
  );
}

function preview(value: string | undefined, maxLength: number): string {
  if (!value) return "";
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}…`
    : value;
}

export function ApprovalCard({ approval, queuedCount, onDecision }: Props) {
  const dialog = useDialog();
  const { colors } = useTheme();
  const isShell = approval.toolName === "execute_shell";
  const options: SelectOption[] = [
    { name: "Allow once", description: "", value: "allow" },
    { name: "Reject", description: "", value: "reject" },
  ];

  const openDetails = () => {
    dialog.open({
      title: isShell ? "Review shell command" : "Review URL request",
      children: <ApprovalDetails approval={approval} />,
    });
  };

  return (
    <box
      width="100%"
      flexDirection="column"
      border
      borderColor={colors.warning ?? colors.secondary}
      padding={1}
      gap={1}
      title="Permission required"
    >
      <box flexDirection="column" onMouseDown={openDetails}>
        <text attributes={TextAttributes.BOLD}>
          {isShell ? "Run shell command" : "Fetch URL"}
        </text>
        {isShell ? (
          <>
            <text attributes={TextAttributes.DIM}>
              In {preview(approval.cwd, 70)}
            </text>
            <text>{preview(approval.command, 100)}</text>
          </>
        ) : (
          <>
            <text>{preview(approval.url, 100)}</text>
            <text attributes={TextAttributes.DIM}>
              HTTP {approval.method}
            </text>
          </>
        )}
        <text attributes={TextAttributes.DIM}>
          Click for full details
          {queuedCount > 1 ? ` · ${queuedCount - 1} more request(s) waiting` : ""}
        </text>
      </box>
      <select
        focused
        width="100%"
        options={options}
        showDescription={false}
        onSelect={(_, option) => {
          if (option?.value === "allow") onDecision(true);
          else if (option?.value === "reject") onDecision(false);
        }}
      />
    </box>
  );
}
