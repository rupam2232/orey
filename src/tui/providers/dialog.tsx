import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface Dialog {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "confirm";
  onConfirm?: () => void;
}

interface DialogContextType {
  dialogs: Dialog[];
  showDialog: (dialog: Omit<Dialog, "id">) => void;
  closeDialog: (id: string) => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
};

export function DialogProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);

  const showDialog = useCallback((dialog: Omit<Dialog, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setDialogs((prev) => [...prev, { ...dialog, id }]);
  }, []);

  const closeDialog = useCallback((id: string) => {
    setDialogs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <DialogContext.Provider value={{ dialogs, showDialog, closeDialog }}>
      {children}
    </DialogContext.Provider>
  );
}
