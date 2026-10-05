import { useEffect, useRef } from "react";
import { DialogSearchList } from "../dialog-search-list";
import {
  DEFAULT_THEME_NAME,
  THEME_LABELS,
  THEME_NAMES,
  useTheme,
  type ThemeName,
} from "@/tui/providers/theme";
import { useDialog } from "@/tui/providers/dialog";

export function ThemeDialogContent() {
  const {
    themeName,
    savedThemeName,
    colors,
    previewTheme,
    restoreTheme,
    setTheme,
  } = useTheme();
  const dialog = useDialog();
  const initialColors = useRef(colors);
  const initialThemeName = useRef(themeName);
  const committed = useRef(false);

  useEffect(() => {
    return () => {
      if (!committed.current) {
        restoreTheme(initialColors.current, initialThemeName.current);
      }
    };
  }, [restoreTheme]);

  const initialThemeIndex = Math.max(
    0,
    THEME_NAMES.indexOf(
      savedThemeName === "custom" ? DEFAULT_THEME_NAME : savedThemeName,
    ),
  );

  return (
    <DialogSearchList<ThemeName>
      items={THEME_NAMES}
      initialSelectedIndex={initialThemeIndex}
      onSelect={(selectedTheme) => {
        committed.current = true;
        setTheme(selectedTheme);
        dialog.close();
      }}
      filterFn={(themeName, query) =>
        THEME_LABELS[themeName].toLowerCase().includes(query.toLowerCase())
      }
      getKey={(themeName) => themeName}
      onHighlight={previewTheme}
      placeholder="Search themes..."
      renderItem={(theme, isSelected) => {
        const isCurrent = theme === savedThemeName;
        return (
          <box
            flexDirection="row"
            justifyContent="space-between"
            width="100%"
            paddingX={1}
          >
            <text fg={isSelected ? "black" : colors.primary}>
              {THEME_LABELS[theme]}
            </text>
            {isCurrent && (
              <text fg={isSelected ? "black" : colors.success}>✓ active</text>
            )}
          </box>
        )
      }}
    />
  );
}