import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { readFileSync, writeFileSync } from "node:fs";
import { OREY_PATHS, ensureOreyBaseDirs } from "../../constants/paths";

export type Colors = {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  background: string;
  surface: string;
};

const THEME_FILE_PATH = OREY_PATHS.configFile;

const DEFAULT_COLORS: Colors = {
  primary: "#00ff00",
  secondary: "#0088ff",
  success: "#00ff00",
  error: "#ff0000",
  background: "#000000",
  surface: "#1a1a1a",
};

interface ThemeContextType {
  colors: Colors;
  setColors: (colors: Colors) => void;
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
  const [colors, setColorsState] = useState<Colors>(() => {
    try {
      const saved = JSON.parse(readFileSync(THEME_FILE_PATH, "utf-8"));
      return saved;
    } catch {
      return DEFAULT_COLORS;
    }
  });

  const setColors = useCallback((newColors: Colors) => {
    setColorsState(newColors);
    try {
      ensureOreyBaseDirs();
      writeFileSync(THEME_FILE_PATH, JSON.stringify(newColors, null, 2));
    } catch (e) {
      // Silently fail - theme still works for this session
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, setColors }}>
      {children}
    </ThemeContext.Provider>
  );
}
