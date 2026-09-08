import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { ModeType } from "@/types";
import type {
  LanguageModelLike,
  ProviderId,
} from "@/ai/providers/types";
import { resolveModel } from "@/ai/config";
import { MODES as MODESCONST } from "@/constants/modes";
import { getProviderConfig } from "@/lib/config";

type PromptConfigContextValue = {
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  toggleMode: () => void;
  model: string;
  setModel: (model: string) => void;
  providerId: ProviderId | null;
  setProvider: (id: ProviderId) => void;
  keyVersion: number;
  notifyConfigChanged: () => void;
  aiModel: LanguageModelLike | null;
  aiModelError: string | null;
};

const PromptConfigContext = createContext<PromptConfigContextValue | null>(
  null,
);

const MODES = MODESCONST.map((m) => m.id);

const PROVIDER_PRIORITY: ProviderId[] = [
  "openrouter",
];

function loadInitialProvider(): ProviderId | null {
  for (const id of PROVIDER_PRIORITY) {
    const cfg = getProviderConfig(id);
    if (cfg?.apiKey) return id;
  }
  return null;
}

function loadInitialModel(providerId: ProviderId | null): string {
  if (!providerId) return "";
  return getProviderConfig(providerId)?.model ?? "";
}

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
  const [providerId, setProviderId] = useState<ProviderId | null>(
    () => loadInitialProvider(),
  );
  const [model, setModel] = useState<string>(() =>
    loadInitialModel(providerId),
  );
  const [keyVersion, setKeyVersion] = useState(0);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const idx = MODES.indexOf(prev);
      const nextIdx = (idx + 1) % MODES.length;
      return MODES[nextIdx]!;
    });
  }, []);

  const setProvider = useCallback(
    (id: ProviderId) => {
      setProviderId(id);
      setModel(loadInitialModel(id));
      setKeyVersion((v) => v + 1);
    },
    [],
  );

  const notifyConfigChanged = useCallback(() => {
    setKeyVersion((v) => v + 1);
  }, []);

  const { aiModel, aiModelError } = useMemo(() => {
    if (!providerId) {
      return { aiModel: null, aiModelError: null };
    }
    const resolution = resolveModel(providerId, model);
    if (resolution.ok) {
      return { aiModel: resolution.model, aiModelError: null };
    }
    return { aiModel: null, aiModelError: resolution.error };
  }, [providerId, model, keyVersion]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
      model,
      setModel,
      providerId,
      setProvider,
      keyVersion,
      notifyConfigChanged,
      aiModel,
      aiModelError,
    }),
    [
      mode,
      toggleMode,
      model,
      providerId,
      setProvider,
      keyVersion,
      notifyConfigChanged,
      aiModel,
      aiModelError,
    ],
  );

  return (
    <PromptConfigContext.Provider value={value}>
      {children}
    </PromptConfigContext.Provider>
  );
}
