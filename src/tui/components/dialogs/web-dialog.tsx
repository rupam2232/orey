import React, { useEffect, useRef, useState } from "react";
import { TextAttributes, type InputRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useDialog } from "@/tui/providers/dialog";
import { useToast } from "@/tui/providers/toast";
import { readConfig, writeConfig } from "@/lib/config";
import { useKeyboardLayer } from "@/tui/providers/keyboard-layer";

export function WebDialogContent() {
  const cfg = readConfig();
  const inputRef = useRef<InputRenderable>(null);
  const [enabled, setEnabled] = useState(cfg.webSearchEnabled ?? false);
  const dialog = useDialog();
  const toast = useToast();
  const existing = cfg.firecrawlApiKey ?? "";
  const { isTopLayer } = useKeyboardLayer();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useKeyboard((key) => {
    if (!isTopLayer("dialog")) return;
    if (key.name.toLowerCase() === "w" && (key.meta || key.option || (key as any).alt)) {
      key.preventDefault();
      if (!readConfig().firecrawlApiKey) {
        toast.show({ variant: "error", message: "Firecrawl API key not set" });
        return;
      }
      const newEnabled = !enabled;
      setEnabled((p) => !p);
      writeConfig({ ...readConfig(), webSearchEnabled: newEnabled });
    }
  });

  function handleSubmit() {
    const trimmed = (inputRef.current?.value ?? "").trim() || existing || "";
    writeConfig({ ...readConfig(), firecrawlApiKey: trimmed || undefined, webSearchEnabled: enabled });
    toast.show({ variant: "success", message: "Firecrawl settings saved" });
    dialog.close();
  }

  return (
    <box flexDirection="column" gap={1}>
      <text attributes={TextAttributes.DIM}>Enter Firecrawl API Key to access web</text>
      <input ref={inputRef} onSubmit={handleSubmit} placeholder="fc-..." maxLength={512} />
      <box flexDirection="row" alignItems="center" justifyContent="space-between" marginTop={1}>
        <box flexDirection="row" gap={2}>
          <text><span fg="green">↵</span> save</text>
          <text><span fg="yellow">alt+w</span> toggle web access</text>
        </box>
        <text fg={enabled ? "green" : "red"}>{enabled ? "✓ enabled" : "✕ disabled"}</text>
      </box>
    </box>
  );
}
