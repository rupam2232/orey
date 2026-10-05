import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { readConfig, writeConfig, type ThemeColors } from "@/lib/config";

export const THEMES = {
  monochrome: {
    primary: "#ffffff",
    secondary: "#ffffff",
    success: "#00ff00",
    error: "#ff0000",
    background: "#000000",
    surface: "#161616",
    markdownText: "#ffffff",
    markdownHeading: "#ffffff",
    markdownLink: "#ffffff",
    markdownCode: "#ffffff",
    markdownQuote: "#ffffff",
    markdownEmphasis: "#ffffff",
    markdownStrong: "#ffffff",
    markdownList: "#ffffff",
    text: "#ffffff",
    textMuted: "#ffffff",
    warning: "#ffff00",
    info: "#0088ff",
    selectedText: "#000000",
  },
  neon: {
    primary: "#00ff00",
    secondary: "#0088ff",
    success: "#00ff00",
    error: "#ff0000",
    background: "#000000",
    surface: "#1a1a1a",
    markdownText: "#ffffff",
    markdownHeading: "#00ff00",
    markdownLink: "#00ffff",
    markdownCode: "#00ffff",
    markdownQuote: "#888888",
    markdownEmphasis: "#cccccc",
    markdownStrong: "#ffffff",
    markdownList: "#00ffff",
    text: "#ffffff",
    textMuted: "#888888",
    warning: "#ffff00",
    info: "#0088ff",
    selectedText: "#000000",
  },
  ocean: {
    primary: "#67e8f9",
    secondary: "#38bdf8",
    success: "#34d399",
    error: "#fb7185",
    background: "#07111f",
    surface: "#10243a",
    markdownText: "#e0f2fe",
    markdownHeading: "#67e8f9",
    markdownLink: "#38bdf8",
    markdownCode: "#34d399",
    markdownQuote: "#94a3b8",
    markdownEmphasis: "#fef08a",
    markdownStrong: "#f8fafc",
    markdownList: "#67e8f9",
    text: "#e0f2fe",
    textMuted: "#94a3b8",
    warning: "#fef08a",
    info: "#38bdf8",
    selectedText: "#07111f",
  },
  forest: {
    primary: "#bef264",
    secondary: "#4ade80",
    success: "#86efac",
    error: "#fb7185",
    background: "#0b1712",
    surface: "#173225",
    markdownText: "#ecfccb",
    markdownHeading: "#bef264",
    markdownLink: "#4ade80",
    markdownCode: "#86efac",
    markdownQuote: "#a3a3a3",
    markdownEmphasis: "#fde047",
    markdownStrong: "#f7fee7",
    markdownList: "#bef264",
    text: "#ecfccb",
    textMuted: "#a3a3a3",
    warning: "#fde047",
    info: "#4ade80",
    selectedText: "#0b1712",
  },
  sunset: {
    primary: "#fdba74",
    secondary: "#fb7185",
    success: "#00ff00",
    error: "#ff0000",
    background: "#1f1210",
    surface: "#38201c",
    markdownText: "#fff7ed",
    markdownHeading: "#fdba74",
    markdownLink: "#fb7185",
    markdownCode: "#facc15",
    markdownQuote: "#d6d3d1",
    markdownEmphasis: "#fcd34d",
    markdownStrong: "#ffedd5",
    markdownList: "#fdba74",
    text: "#fff7ed",
    textMuted: "#d6d3d1",
    warning: "#ffff00",
    info: "#0088ff",
    selectedText: "#1f1210",
  },
} satisfies Record<string, ThemeColors>;

export type ThemeName = keyof typeof THEMES;

export const THEME_LABELS: Record<ThemeName, string> = {
  monochrome: "Monochrome",
  neon: "Neon",
  ocean: "Ocean",
  forest: "Forest",
  sunset: "Sunset",
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const DEFAULT_THEME_NAME: ThemeName = "monochrome";

const DEFAULT_COLORS: ThemeColors = THEMES.monochrome;

function getThemeName(colors: ThemeColors | undefined): ThemeName | "custom" {
  if (!colors) return DEFAULT_THEME_NAME;

  const entry = Object.entries(THEMES).find(([, themeColors]) =>
    Object.entries(colors).every(
      ([key, value]) =>
        themeColors[key as keyof ThemeColors] === value,
    ),
  );
  return (entry?.[0] as ThemeName | undefined) ?? "custom";
}

interface ThemeContextType {
  colors: ThemeColors;
  themeName: ThemeName | "custom";
  savedThemeName: ThemeName | "custom";
  setColors: (colors: ThemeColors) => void;
  setTheme: (themeName: ThemeName) => void;
  previewTheme: (themeName: ThemeName) => void;
  restoreTheme: (
    colors: ThemeColors,
    themeName: ThemeName | "custom",
  ) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const savedColors = readConfig().theme;
  const [colors, setColorsState] = useState<ThemeColors>(() => {
    return savedColors ?? DEFAULT_COLORS;
  });
  const initialThemeName = getThemeName(savedColors);
  const [themeName, setThemeName] = useState<ThemeName | "custom">(
    initialThemeName,
  );
  const [savedThemeName, setSavedThemeName] = useState<ThemeName | "custom">(
    initialThemeName,
  );

  const setColors = useCallback((newColors: ThemeColors) => {
    setColorsState(newColors);
    setThemeName("custom");
    setSavedThemeName("custom");
    const config = readConfig();
    config.theme = newColors;
    writeConfig(config);
  }, []);

  const setTheme = useCallback((newThemeName: ThemeName) => {
    const newColors = THEMES[newThemeName];
    setColorsState(newColors);
    setThemeName(newThemeName);
    setSavedThemeName(newThemeName);
    const config = readConfig();
    config.theme = newColors;
    writeConfig(config);
  }, []);

  const previewTheme = useCallback((newThemeName: ThemeName) => {
    setColorsState(THEMES[newThemeName]);
    setThemeName(newThemeName);
  }, []);

  const restoreTheme = useCallback(
    (previousColors: ThemeColors, previousThemeName: ThemeName | "custom") => {
      setColorsState(previousColors);
      setThemeName(previousThemeName);
    },
    [],
  );

  return (
    <ThemeContext.Provider
      value={{
        colors,
        themeName,
        savedThemeName,
        setColors,
        setTheme,
        previewTheme,
        restoreTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
