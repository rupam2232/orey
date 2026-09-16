import React, { useCallback, useEffect, useRef, useState } from "react";
import { TextAttributes } from "@opentui/core";
import type { InputRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { providerRegistry } from "@/ai/providers/registry";
import type { ModelInfo, ModelProvider, ProviderId } from "@/ai/providers/types";
import { DialogSearchList } from "../dialog-search-list";
import { useDialog } from "@/tui/providers/dialog";
import { useToast } from "@/tui/providers/toast";
import { useKeyboardLayer } from "@/tui/providers/keyboard-layer";
import {
  getProviderConfig,
  setProviderApiKey,
  setProviderModel,
} from "@/lib/config";
import { usePromptConfig } from "@/tui/providers/prompt-config";

type Step = "select-provider" | "enter-api-key" | "select-model";

type Props = {
  initialProviderId?: ProviderId;
  onSelectModel: (providerId: ProviderId, modelId: string) => void;
};

export function ModelsDialogContent({
  initialProviderId,
  onSelectModel,
}: Props) {
  const {
    providerId: activeProviderId,
    model: activeModel,
    setModel: setActiveModel,
    setProvider: setActiveProvider,
    notifyConfigChanged,
  } = usePromptConfig();
  const dialog = useDialog();
  const toast = useToast();
  const { isTopLayer } = useKeyboardLayer();

  const startProviderId = initialProviderId ?? activeProviderId;
  const initialConfig = startProviderId
    ? getProviderConfig(startProviderId)
    : undefined;

  const [step, setStep] = useState<Step>(() =>
    startProviderId && initialConfig?.apiKey
      ? "select-model"
      : "select-provider",
  );
  const [providerId, setProviderId] = useState<ProviderId | null>(
    startProviderId ?? null,
  );
  const [refetchNonce, setRefetchNonce] = useState(0);

  const goToProviderSelection = useCallback(() => {
    setProviderId(null);
    setStep("select-provider");
  }, []);

  const handleProviderSelect = useCallback(
    (next: ModelProvider) => {
      setProviderId(next.id);
      setActiveProvider(next.id);
      const cfg = getProviderConfig(next.id);
      setStep(cfg?.apiKey ? "select-model" : "enter-api-key");
    },
    [setActiveProvider],
  );

  const persistApiKeyAndContinue = useCallback(
    (provider: ModelProvider, apiKey: string) => {
      setProviderApiKey(provider.id, apiKey.trim());
      if (!activeProviderId) {
        setActiveProvider(provider.id);
      } else {
        notifyConfigChanged();
      }
      toast.show({
        variant: "success",
        message: `Saved ${provider.name} API key`,
      });
      setRefetchNonce((n) => n + 1);
      setStep("select-model");
    },
    [activeProviderId, setActiveProvider, notifyConfigChanged, toast],
  );

  const handleApiKeySubmit = useCallback(
    async (apiKey: string) => {
      if (!providerId) return;
      const provider = providerRegistry.get(providerId);
      if (!provider) return;
      const result = provider.validateApiKey(apiKey);
      if (result instanceof Promise) {
        const r = await result;
        if (!r.ok) {
          toast.show({
            variant: "error",
            message: r.error ?? "Invalid API key",
          });
          return;
        }
        persistApiKeyAndContinue(provider, apiKey);
        return;
      }
      if (!result.ok) {
        toast.show({
          variant: "error",
          message: result.error ?? "Invalid API key",
        });
        return;
      }
      persistApiKeyAndContinue(provider, apiKey);
    },
    [providerId, persistApiKeyAndContinue, toast],
  );

  const handleModelSelect = useCallback(
    (model: ModelInfo) => {
      if (!providerId) return;
      setProviderModel(providerId, model.id);
      setActiveModel(model.id);
      setActiveProvider(providerId);
      notifyConfigChanged();
      onSelectModel(providerId, model.id);
      toast.show({
        variant: "success",
        message: `Model set to ${model.name}`,
      });
      dialog.close();
    },
    [
      providerId,
      dialog,
      onSelectModel,
      setActiveModel,
      setActiveProvider,
      notifyConfigChanged,
      toast,
    ],
  );

  useGlobalShortcuts({
    enabled: isTopLayer("dialog"),
    onChangeProvider: goToProviderSelection,
    onChangeApiKey: () => {
      if (step === "select-model" && providerId) {
        setStep("enter-api-key");
      }
    },
  });

  if (step === "select-provider") {
    return (
      <ProviderList
        currentProviderId={activeProviderId}
        onSelect={handleProviderSelect}
      />
    );
  }

  if (step === "enter-api-key" && providerId) {
    const provider = providerRegistry.get(providerId);
    if (!provider) {
      goToProviderSelection();
      return null;
    }
    return (
      <ApiKeyStep
        provider={provider}
        onSubmit={handleApiKeySubmit}
        onBack={goToProviderSelection}
      />
    );
  }

  if (step === "select-model" && providerId) {
    const provider = providerRegistry.get(providerId);
    if (!provider) {
      goToProviderSelection();
      return null;
    }
    return (
      <ModelList
        key={refetchNonce}
        provider={provider}
        currentModel={activeModel}
        onSelect={handleModelSelect}
      />
    );
  }

  return null;
}

function useGlobalShortcuts({
  enabled,
  onChangeProvider,
  onChangeApiKey,
}: {
  enabled: boolean;
  onChangeProvider: () => void;
  onChangeApiKey: () => void;
}) {
  useKeyboard((key) => {
    if (!enabled) return;
    if (isMeta(key, "p")) {
      key.preventDefault();
      onChangeProvider();
    } else if (isCtrl(key, "a")) {
      key.preventDefault();
      onChangeProvider();
    } else if (isMeta(key, "k")) {
      key.preventDefault();
      onChangeApiKey();
    }
  });
}

function isMeta(key: { name: string; meta?: boolean; option?: boolean }, target: string): boolean {
  if (key.name.toLowerCase() !== target) return false;
  return Boolean(key.meta || key.option);
}

function isCtrl(key: { name: string; ctrl?: boolean }, target: string): boolean {
  if (key.name.toLowerCase() !== target) return false;
  return Boolean(key.ctrl);
}

function isAltB(key: { name: string; meta?: boolean; option?: boolean; alt?: boolean }): boolean {
  if (key.name.toLowerCase() !== "b") return false;
  return Boolean(key.meta || key.option || key.alt);
}

function ProviderList({
  currentProviderId,
  onSelect,
}: {
  currentProviderId: ProviderId | null;
  onSelect: (provider: ModelProvider) => void;
}) {
  const providers = providerRegistry.list();

  return (
    <DialogSearchList<ModelProvider>
      items={providers}
      placeholder="Search providers..."
      emptyText="No providers available"
      filterFn={(item, query) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      }
      getKey={(item) => item.id}
      onSelect={onSelect}
      renderItem={(item, isSelected) => {
        const isCurrent = item.id === currentProviderId;
        return (
          <box
            flexDirection="row"
            justifyContent="space-between"
            width="100%"
            paddingX={1}
          >
            <box flexDirection="column" flexGrow={1}>
              <text fg={isSelected ? "black" : "white"}>{item.name}</text>
            </box>
            {isCurrent && (
              <text fg={isSelected ? "black" : "green"}>✓ active</text>
            )}
          </box>
        );
      }}
    />
  );
}

function ApiKeyStep({
  provider,
  onSubmit,
  onBack,
}: {
  provider: ModelProvider;
  onSubmit: (key: string) => void;
  onBack: () => void;
}) {
  const inputRef = useRef<InputRenderable>(null);
  const existing = getProviderConfig(provider.id)?.apiKey;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit() {
    const toSubmit = (inputRef.current?.value ?? "").trim() || existing || "";
    if (!toSubmit) return;
    onSubmit(toSubmit);
  }

  function handleBack(key: { preventDefault: () => void }) {
    key.preventDefault();
    onBack();
  }

  return (
    <box flexDirection="column" gap={1}>
      <text attributes={TextAttributes.DIM}>
        {provider.apiKeyLabel}
        {existing ? " (leave blank to keep current)" : ""}
      </text>
      <input
        ref={inputRef}
        onSubmit={handleSubmit}
        placeholder={provider.apiKeyPlaceholder}
        maxLength={512}
      />
      <box flexDirection="row" gap={2} marginTop={1}>
        <text>
          <span fg="green">↵</span> save
        </text>
        <text>
          <span fg="red">alt+b</span> back
        </text>
      </box>
      <BackKeyCatcher onBack={handleBack} />
    </box>
  );
}

function BackKeyCatcher({ onBack }: { onBack: (key: { preventDefault: () => void }) => void }) {
  useKeyboard((key) => {
    if (isAltB(key)) {
      onBack(key);
    }
  });
  return null;
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; models: ModelInfo[] };

function ModelList({
  provider,
  currentModel,
  onSelect,
}: {
  provider: ModelProvider;
  currentModel: string;
  onSelect: (model: ModelInfo) => void;
}) {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [manual, setManual] = useState(false);
  const { isTopLayer } = useKeyboardLayer();

  const loadModels = useCallback(async () => {
    setState({ status: "loading" });
    const cfg = getProviderConfig(provider.id);
    if (!cfg?.apiKey) {
      setState({ status: "error", error: "No API key configured" });
      return;
    }
    try {
      const models = await provider.fetchModels(cfg.apiKey);
      setState({ status: "ready", models });
    } catch (e) {
      setState({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [provider]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  useKeyboard((key) => {
    if (!isTopLayer("dialog")) return;
    if (!provider.supportsManualEntry) return;
    if (isMeta(key, "m")) {
      key.preventDefault();
      setManual(true);
    }
  });

  if (state.status === "loading") {
    return <text attributes={TextAttributes.DIM}>Loading models…</text>;
  }

  if (state.status === "error") {
    return (
      <box flexDirection="column" gap={1}>
        <text fg="red">Failed to load models: {state.error}</text>
        <box flexDirection="row" gap={2}>
          <text>
            <span fg="yellow">ctrl+a</span> change provider
          </text>
          <text>
            <span fg="yellow">alt+k</span> update API key
          </text>
        </box>
      </box>
    );
  }

  if (manual) {
    return (
      <ManualModelInput
        provider={provider}
        onCancel={() => setManual(false)}
        onSubmit={(id) => onSelect({ id, name: id })}
        enabled={isTopLayer("dialog")}
      />
    );
  }

  return (
    <box flexDirection="column" gap={1}>
      <DialogSearchList<ModelInfo>
        items={state.models}
        placeholder="Search models..."
        emptyText="No models found"
        filterFn={(item, query) =>
          item.id.toLowerCase().includes(query.toLowerCase()) ||
          item.name.toLowerCase().includes(query.toLowerCase())
        }
        getKey={(item) => item.id}
        onSelect={onSelect}
        renderItem={(item, isSelected) => {
          const isCurrent = item.id === currentModel;
          return (
            <box
              flexDirection="row"
              justifyContent="space-between"
              width="100%"
              paddingX={1}
            >
              <box flexDirection="column" flexGrow={1} minWidth={0}>
                <text fg={isSelected ? "black" : "white"}>{item.name}</text>
              </box>
              {isCurrent && (
                <text fg={isSelected ? "black" : "green"}>✓</text>
              )}
            </box>
          );
        }}
      />
      <box flexDirection="row" gap={2} marginTop={1}>
        {provider.supportsManualEntry && (
          <text>
            <span fg="cyan">alt+m</span> enter manually
          </text>
        )}
        <text>
          <span fg="yellow">ctrl+a</span> provider
        </text>
        <text>
          <span fg="yellow">alt+k</span> api key
        </text>
      </box>
    </box>
  );
}

function ManualModelInput({
  provider,
  onCancel,
  onSubmit,
  enabled,
}: {
  provider: ModelProvider;
  onCancel: () => void;
  onSubmit: (id: string) => void;
  enabled: boolean;
}) {
  const inputRef = useRef<InputRenderable>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit() {
    const trimmed = (inputRef.current?.value ?? "").trim();
    if (trimmed) onSubmit(trimmed);
  }

  function handleBack(key: { preventDefault: () => void }) {
    key.preventDefault();
    onCancel();
  }

  return (
    <box flexDirection="column" gap={1}>
      <text attributes={TextAttributes.DIM}>Type a {provider.name} model id</text>
      <input
        ref={inputRef}
        onSubmit={handleSubmit}
        placeholder="e.g. anthropic/claude-3.5-sonnet"
      />
      <box flexDirection="row" gap={2} marginTop={1}>
        <text>
          <span fg="green">↵</span> use
        </text>
        <text>
          <span fg="red">alt+b</span> back
        </text>
      </box>
      {enabled && <BackKeyCatcher onBack={handleBack} />}
    </box>
  );
}
