import { providerRegistry } from "./providers/registry";
import { getProviderConfig } from "@/lib/config";
import type { LanguageModelLike, ProviderId } from "./providers/types";

export type ModelResolution =
  | { ok: true; model: LanguageModelLike; providerId: ProviderId; modelId: string }
  | { ok: false; error: string };

export function resolveModel(
  providerId: ProviderId | null,
  modelId: string,
): ModelResolution {
  if (!providerId) {
    return {
      ok: false,
      error: "No provider selected. Use /models to choose a provider and model.",
    };
  }
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    return {
      ok: false,
      error: `Unknown provider: ${providerId}. Use /models to reconfigure.`,
    };
  }
  const cfg = getProviderConfig(providerId);
  if (!cfg?.apiKey) {
    return {
      ok: false,
      error: `No API key for ${provider.name}. Use /models to set one.`,
    };
  }
  if (!modelId) {
    return {
      ok: false,
      error: `No model selected for ${provider.name}. Use /models to pick one.`,
    };
  }
  try {
    const model = provider.buildModel(modelId, cfg.apiKey);
    return { ok: true, model, providerId, modelId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
