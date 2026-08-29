import { useState, useCallback, useRef } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useKeyboardLayer } from "../../providers/keyboard-layer";
import { filterCommands } from "./filter-commands";
import type { Command } from "@/types/command";

export function useCommandMenu() {
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  const { push, pop, isTopLayer } = useKeyboardLayer();

  const openMenu = useCallback(() => {
    setShowCommandMenu(true);
    push("command", () => {
      setShowCommandMenu(false);
      pop("command");
      return true;
    });
  }, [push, pop]);

  const closeMenu = useCallback(() => {
    setShowCommandMenu(false);
    pop("command");
  }, [pop]);

  const handleContentChange = useCallback(
    (text: string) => {
      if (text.startsWith("/") && !text.includes(" ")) {
        setCommandQuery(text);
        if (!showCommandMenu) {
          openMenu();
        }
        setSelectedIndex(0);
      } else {
        if (showCommandMenu) {
          closeMenu();
        }
      }
    },
    [showCommandMenu, openMenu, closeMenu],
  );

  const filteredCommands = filterCommands(commandQuery);

  const resolveCommand = useCallback(
    (index: number): Command | undefined => {
      closeMenu();
      return filteredCommands[index];
    },
    [filteredCommands, closeMenu],
  );

  useKeyboard((key) => {
    if (!showCommandMenu || !isTopLayer("command")) return;

    if (key.name === "escape") {
      key.preventDefault();
      closeMenu();
    } else if (key.name === "up") {
      key.preventDefault();
      setSelectedIndex((prev) => {
        const nextIndex = Math.max(0, prev - 1);
        const scrollbox = scrollRef.current;
        if (scrollbox && nextIndex < scrollbox.scrollTop) {
          scrollbox.scrollTo(nextIndex);
        }
        return nextIndex;
      });
    } else if (key.name === "down") {
      key.preventDefault();
      setSelectedIndex((prev) => {
        if (filteredCommands.length === 0) return 0;
        const nextIndex = Math.min(filteredCommands.length - 1, prev + 1);
        const scrollbox = scrollRef.current;
        if (scrollbox) {
          const viewportHeight = scrollbox.viewport.height;
          const visibleEnd = scrollbox.scrollTop + viewportHeight - 1;
          if (nextIndex > visibleEnd) {
            scrollbox.scrollTo(nextIndex - viewportHeight + 1);
          }
        }
        return nextIndex;
      });
    }
  });

  return {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  };
}