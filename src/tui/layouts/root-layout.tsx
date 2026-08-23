import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { ThemeProvider } from "../providers/theme";
import { DialogProvider } from "../providers/dialog";
import { PromptConfigProvider } from "../providers/prompt-config";
import { KeyboardLayerProvider } from "../providers/keyboard-layer";
import { ToastProvider } from "../providers/toast";

export function RootLayout(): ReactNode {
  return (
    <ThemeProvider>
      <DialogProvider>
        <PromptConfigProvider>
          <KeyboardLayerProvider>
            <ToastProvider>
              <Outlet />
            </ToastProvider>
          </KeyboardLayerProvider>
        </PromptConfigProvider>
      </DialogProvider>
    </ThemeProvider>
  );
}
