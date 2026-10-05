import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { ThemeProvider } from "../providers/theme";
import { KeyboardLayerProvider } from "../providers/keyboard-layer";
import { ToastProvider } from "../providers/toast";
import { PromptConfigProvider } from "../providers/prompt-config";
import { DialogProvider } from "../providers/dialog";
import { TerminalDimensionsProvider } from "../providers/terminal-dimensions";

export function RootLayout(): ReactNode {
  return (
    <TerminalDimensionsProvider>
      <ThemeProvider>
        <KeyboardLayerProvider>
          <ToastProvider>
            <PromptConfigProvider>
              <DialogProvider>
                <Outlet />
              </DialogProvider>
            </PromptConfigProvider>
          </ToastProvider>
        </KeyboardLayerProvider>
      </ThemeProvider>
    </TerminalDimensionsProvider>
  );
}
