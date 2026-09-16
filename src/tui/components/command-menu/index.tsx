import type { RefObject } from "react";
import { ScrollBoxRenderable, TextAttributes } from "@opentui/core";
import { filterCommands } from "./filter-commands";

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
            backgroundColor={isSelected ? "white" : undefined}
            onMouseMove={() => onSelect(index)}
            onMouseDown={() => onExecute(index)}
          >
            <box width={14} flexShrink={0}>
              <text selectable={false} fg={isSelected ? "black" : "white"}>
                /{command.name}
              </text>
            </box>
            <box flexGrow={1} overflow="hidden">
              <text selectable={false} fg={isSelected ? "black" : "gray"}>
                {command.description}
              </text>
            </box>
          </box>
        );
      })}
    </scrollbox>
  );
}

