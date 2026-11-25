import type { AgentConfig } from "./types";
import { ActionTracker } from "./action-tracker";
import { ToolExecutor } from "./tool-executor";

export type SessionActionContext = {
  tracker: ActionTracker;
  executor: ToolExecutor;
};

const contexts = new Map<string, SessionActionContext>();

export function getExistingSessionActionContext(
  sessionId: string,
): SessionActionContext | undefined {
  return contexts.get(sessionId);
}

export function getSessionActionContext(
  sessionId: string,
  config: AgentConfig,
): SessionActionContext {
  const existing = contexts.get(sessionId);
  if (existing) {
    existing.executor.updateConfig(config);
    return existing;
  }

  const tracker = new ActionTracker();
  const context = {
    tracker,
    executor: new ToolExecutor(tracker, config),
  };
  contexts.set(sessionId, context);
  return context;
}
