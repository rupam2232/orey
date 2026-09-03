import type { ModelProvider, ProviderId } from "./types";
import { openrouterProvider } from "./openrouter";

class ProviderRegistry {
  private providers = new Map<ProviderId, ModelProvider>();

  constructor() {
    this.register(openrouterProvider);
  }

  register(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: ProviderId): ModelProvider | undefined {
    return this.providers.get(id);
  }

  list(): ModelProvider[] {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new ProviderRegistry();
