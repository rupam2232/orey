import { randomUUID } from "node:crypto";
import type { ActionLog, ActionStatus } from "./types";
import { isMutationType } from "./types";

export class ActionTracker {
  private actions: ActionLog[] = [];

  log(
    entry: Omit<ActionLog, "id" | "timestamp"> & {
      id?: string;
      timestamp?: Date;
    },
  ): ActionLog {
    const action: ActionLog = {
      id: entry.id ?? `action_${randomUUID()}`,
      timestamp: entry.timestamp ?? new Date(),
      type: entry.type,
      path: entry.path,
      details: { ...entry.details },
      status: entry.status,
      userApproved: entry.userApproved,
    };
    this.actions.push(action);
    return action;
  }

  getActions(): readonly ActionLog[] {
    return this.actions;
  }

  findLatest(type: ActionLog["type"], path: string): ActionLog | undefined {
    return [...this.actions]
      .reverse()
      .find(
        (action) =>
          action.type === type &&
          action.path === path,
      );
  }

  getPendingMutations(): ActionLog[] {
    return this.actions.filter(
      (a) => isMutationType(a.type) && a.status === "pending",
    );
  }

  updateStatus(id: string, status: ActionStatus, userApproved?: boolean): void {
    const a = this.actions.find((x) => x.id === id);
    if (!a) return;
    a.status = status;
    if (userApproved !== undefined) a.userApproved = userApproved;
  }

  updateDetails(id: string, details: Partial<ActionLog["details"]>): void {
    const action = this.actions.find((x) => x.id === id);
    if (!action) return;
    Object.assign(action.details, details);
  }

  markReverted(id: string): ActionLog | undefined {
    const action = this.actions.find((x) => x.id === id);
    if (!action) return undefined;
    action.reverted = true;
    action.status = "reverted";
    return action;
  }
}
