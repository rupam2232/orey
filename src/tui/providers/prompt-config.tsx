import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { ModeType } from "../../types/index";

type PromptConfigContextValue = {
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  model: string;
  setModel: (model: string) => void;
};

const PromptConfigContext = createContext<PromptConfigContextValue | null>(
  null,
);

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

  return (
    <PromptConfigContext.Provider value={{ mode, setMode, model, setModel }}>
      {children}
    </PromptConfigContext.Provider>
  );
}
