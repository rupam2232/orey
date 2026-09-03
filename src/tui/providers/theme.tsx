import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { readConfig, writeConfig, type ThemeColors } from "@/lib/config";

const DEFAULT_COLORS: ThemeColors = {
  primary: "#00ff00",
  secondary: "#0088ff",
  success: "#00ff00",
  error: "#ff0000",
  background: "#000000",
  surface: "#1a1a1a",
};

interface ThemeContextType {
  colors: ThemeColors;
  setColors: (colors: ThemeColors) => void;
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
  const [colors, setColorsState] = useState<ThemeColors>(() => {
    return readConfig().theme ?? DEFAULT_COLORS;
  });

  const setColors = useCallback((newColors: ThemeColors) => {
    setColorsState(newColors);
    const config = readConfig();
    config.theme = newColors;
    writeConfig(config);
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, setColors }}>
      {children}
    </ThemeContext.Provider>
  );
}
