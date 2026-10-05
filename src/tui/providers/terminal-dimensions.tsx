import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useTerminalDimensions } from "@opentui/react";

type TerminalDimensions = {
  width: number;
  height: number;
};

const TerminalDimensionsContext = createContext<TerminalDimensions | null>(
  null,
);

export function TerminalDimensionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const dimensions = useTerminalDimensions();

  return (
    <TerminalDimensionsContext.Provider value={dimensions}>
      {children}
    </TerminalDimensionsContext.Provider>
  );
}

export function useTerminalDimensionsContext(): TerminalDimensions {
  const dimensions = useContext(TerminalDimensionsContext);
  if (!dimensions) {
    throw new Error(
      "useTerminalDimensionsContext must be used within TerminalDimensionsProvider",
    );
  }
  return dimensions;
}