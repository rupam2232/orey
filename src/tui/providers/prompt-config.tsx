import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { ModeType } from "@/types";
import { MODES as MODESCONST } from "@/constants/modes";

type PromptConfigContextValue = {
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  model: string;
  setModel: (model: string) => void;
  toggleMode: () => void;
};

const PromptConfigContext = createContext<PromptConfigContextValue | null>(
  null,
);

const MODES = MODESCONST.map((m) => m.id);

export function usePromptConfig(): PromptConfigContextValue {
  const ctx = useContext(PromptConfigContext);
  if (!ctx) {
    throw new Error("usePromptConfig must be used within PromptConfigProvider");
  }
  return ctx;
}

export function PromptConfigProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [mode, setMode] = useState<ModeType>("agent");
  const [model, setModel] = useState<string>("");
  
  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const idx = MODES.indexOf(prev);
      const nextIdx = (idx + 1) % MODES.length;
      return MODES[nextIdx]!;
    });
  }, []);

  return (
    <PromptConfigContext.Provider value={{ mode, setMode, model, setModel, toggleMode }}>
      {children}
    </PromptConfigContext.Provider>
  );
}
