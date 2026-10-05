import type { RefObject } from "react";
import { ScrollBoxRenderable, TextAttributes } from "@opentui/core";
import { filterCommands } from "./filter-commands";
import { useTheme } from "@/tui/providers/theme";

const MAX_VISIBLE_COMMANDS = 6;

type CommandMenuProps = {
  query: string;
  selectedIndex: number;
  scrollRef: RefObject<ScrollBoxRenderable | null>;
  onSelect: (index: number) => void;
  onExecute: (index: number) => void;
};

export function CommandMenu({
  query,
  selectedIndex,
  scrollRef,
  onSelect,
  onExecute,
}: CommandMenuProps) {
  const commands = filterCommands(query);
  const visibleHeight = Math.min(commands.length, MAX_VISIBLE_COMMANDS);
  const { colors } = useTheme();

  if (commands.length === 0) {
    return (
      <box paddingX={1} height={1}>
        <text attributes={TextAttributes.DIM}>No matching commands</text>
      </box>
    );
  }

  return (
    <scrollbox ref={scrollRef} height={visibleHeight}>
      {commands.map((command, index) => {
        const isSelected = index === selectedIndex;
        return (
          <box
            key={command.name}
            flexDirection="row"
            paddingX={1}
            height={1}
            overflow="hidden"
            backgroundColor={isSelected ? colors.primary : undefined}
            onMouseMove={() => onSelect(index)}
            onMouseDown={() => onExecute(index)}
          >
            <box width={14} flexShrink={0}>
              <text
                selectable={false}
                fg={isSelected ? colors.selectedText ?? colors.background : colors.text ?? colors.primary}
              >
                /{command.name}
              </text>
            </box>
            <box flexGrow={1} overflow="hidden">
              <text
                selectable={false}
                fg={isSelected ? colors.selectedText ?? colors.background : colors.textMuted ?? colors.secondary}
              >
                {command.description}
              </text>
            </box>
          </box>
        );
      })}
    </scrollbox>
  );
}

