import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { OREY_PATHS, ensureOreyBaseDirs } from "@/constants/paths";
import type { ProviderId } from "@/ai/providers/types";

export type StoredProviderConfig = {
  providerId: ProviderId;
  apiKey: string;
  model?: string;
  updatedAt: string;
};

export type ProviderConfigList = StoredProviderConfig[];

export type ThemeColors = {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  background: string;
  surface: string;
};

export type OreyConfig = {
  theme?: ThemeColors;
  providers?: ProviderConfigList;
  firecrawlApiKey?: string;
  webSearchEnabled?: boolean;
};

const CONFIG_FILE = OREY_PATHS.configFile;

function readConfigRaw(): OreyConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const config: OreyConfig = { ...parsed };
    if (config.providers && !Array.isArray(config.providers)) {
      config.providers = Object.values(config.providers);
    }
    return config;
  } catch {
    return {};
  }
}

function writeConfigRaw(config: OreyConfig): void {
  ensureOreyBaseDirs();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function readConfig(): OreyConfig {
  return readConfigRaw();
}

export function writeConfig(config: OreyConfig): void {
  writeConfigRaw(config);
}

function findProviderIndex(
  list: ProviderConfigList | undefined,
  providerId: ProviderId,
): number {
  if (!list || !Array.isArray(list)) return -1;
  return list.findIndex((p) => p.providerId === providerId);
}

export function getProviderConfig(
  providerId: ProviderId,
): StoredProviderConfig | undefined {
  const list = readConfigRaw().providers;
  if (!list) return undefined;
  const idx = findProviderIndex(list, providerId);
  return idx >= 0 ? list[idx] : undefined;
}

export function setProviderApiKey(
  providerId: ProviderId,
  apiKey: string,
): void {
  const config = readConfigRaw();
  const list = [...(config.providers ?? [])];
  const idx = findProviderIndex(list, providerId);
  const existing = idx >= 0 ? list[idx] : undefined;
  const next: StoredProviderConfig = {
    providerId,
    apiKey,
    model: existing?.model,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    list[idx] = next;
  } else {
    list.push(next);
  }
  config.providers = list;
  writeConfigRaw(config);
}

export function setProviderModel(
  providerId: ProviderId,
  model: string,
): void {
  const config = readConfigRaw();
  const list = [...(config.providers ?? [])];
  const idx = findProviderIndex(list, providerId);
  if (idx < 0) return;
  list[idx] = {
    ...list[idx]!,
    model,
    updatedAt: new Date().toISOString(),
  };
  config.providers = list;
  writeConfigRaw(config);
}

export function clearProviderConfig(providerId: ProviderId): void {
  const config = readConfigRaw();
  if (!config.providers) return;
  config.providers = config.providers.filter(
    (p) => p.providerId !== providerId,
  );
  writeConfigRaw(config);
}
