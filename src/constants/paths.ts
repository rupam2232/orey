import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const OREY_HOME_DIR = join(homedir(), ".orey");

export const OREY_PATHS = {
  home: OREY_HOME_DIR,
  configFile: join(OREY_HOME_DIR, "config.json"),
  sessionsDir: join(OREY_HOME_DIR, "sessions"),
  sessionsFile: join(OREY_HOME_DIR, "sessions.json"),
  logsDir: join(OREY_HOME_DIR, "logs"),
} as const;

export function ensureOreyBaseDirs(): void {
  mkdirSync(OREY_PATHS.home, { recursive: true });
  mkdirSync(OREY_PATHS.sessionsDir, { recursive: true });
  mkdirSync(OREY_PATHS.logsDir, { recursive: true });
}
