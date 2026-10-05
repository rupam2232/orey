import type { ModeType, ModeOption } from "@/types";
import { useDialog } from "@/tui/providers/dialog";
import { DialogSearchList } from "../dialog-search-list";
import { MODES } from "@/constants/modes";
import { useTheme } from "@/tui/providers/theme";

type Props = {
  currentMode: ModeType;
  onSelectMode: (mode: ModeType) => void;
};

export function AgentsDialogContent({ currentMode, onSelectMode }: Props) {
  const dialog = useDialog();
  const { colors } = useTheme();

  return (
    <DialogSearchList<ModeOption>
      items={MODES}
      placeholder="Select mode..."
      filterFn={(item, query) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      }
      getKey={(item) => item.id}
      onSelect={(item) => {
        onSelectMode(item.id);
        dialog.close();
      }}
      renderItem={(item, isSelected) => {
        const isCurrent = item.id === currentMode;
        return (
          <box
            flexDirection="row"
            justifyContent="space-between"
            width="100%"
            paddingX={1}
          >
            <text fg={isSelected ? colors.selectedText ?? colors.background : colors.text ?? colors.primary}>{item.name}</text>
            {isCurrent && (
              <text fg={isSelected ? colors.selectedText ?? colors.background : colors.success}>✓ active</text>
            )}
          </box>
        );
      }}
    />
  );
}

