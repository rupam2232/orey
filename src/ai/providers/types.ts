export type ProviderId = "openrouter";

export type ModelInfo = {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: string;
};

export type ApiKeyValidation =
  | { ok: true }
  | { ok: false; error: string };

export type LanguageModelLike = any;

export type ModelProvider = {
  id: ProviderId;
  name: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  supportsManualEntry: boolean;
  validateApiKey: (key: string) => ApiKeyValidation | Promise<ApiKeyValidation>;
  fetchModels: (apiKey: string) => Promise<ModelInfo[]>;
  buildModel: (modelId: string, apiKey: string) => LanguageModelLike;
};
