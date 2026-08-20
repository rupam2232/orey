import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { ThemeProvider } from "../providers/theme";
import { DialogProvider } from "../providers/dialog";
import { PromptConfigProvider } from "../providers/prompt-config";

export function RootLayout(): ReactNode {
  return (
    <ThemeProvider>
      <DialogProvider>
        <PromptConfigProvider>
          <Outlet />
        </PromptConfigProvider>
      </DialogProvider>
    </ThemeProvider>
  );
}
