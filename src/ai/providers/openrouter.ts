import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ApiKeyValidation, ModelInfo, ModelProvider } from "./types";

const OPENROUTER_MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";

function looksLikeOpenRouterKey(key: string): boolean {
  return key.trim().length >= 20;
}

export const openrouterProvider: ModelProvider = {
  id: "openrouter",
  name: "OpenRouter",
  apiKeyLabel: "OpenRouter API key",
  apiKeyPlaceholder: "sk-or-v1-...",
  supportsManualEntry: true,

  validateApiKey(key: string): ApiKeyValidation {
    const trimmed = key.trim();
    if (!trimmed) return { ok: false, error: "API key is required" };
    if (!looksLikeOpenRouterKey(trimmed)) {
      return { ok: false, error: "OpenRouter keys are at least 20 characters" };
    }
    return { ok: true };
  },

  async fetchModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch(OPENROUTER_MODELS_ENDPOINT, {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });
    if (!res.ok) {
      throw new Error(`OpenRouter responded with ${res.status}`);
    }
    const data = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const list = data.data ?? [];
    return list
      .map((m) => {
        const id = String(m.id ?? "").trim();
        if (!id) return null;
        const name = String(m.name ?? id);
        const description =
          typeof m.description === "string" ? m.description : undefined;
        const contextLength =
          typeof m.context_length === "number"
            ? m.context_length
            : undefined;
        const pricing = m.pricing as
          | { prompt?: string; completion?: string }
          | undefined;
        let priceLabel: string | undefined;
        if (pricing && (pricing.prompt || pricing.completion)) {
          const p = pricing.prompt ?? "?";
          const c = pricing.completion ?? "?";
          priceLabel = `$${p}/$${c} per 1M tokens`;
        }
        return { id, name, description, contextLength, pricing: priceLabel } as ModelInfo;
      })
      .filter((m): m is ModelInfo => m !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  buildModel(modelId: string, apiKey: string) {
    const provider = createOpenRouter({ apiKey: apiKey.trim() });
    return provider(modelId);
  },
};
