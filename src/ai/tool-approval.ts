import type { ActionLog, ActionType } from "./types";
import type { ActionTracker } from "./action-tracker";

export type ApprovalToolName = "execute_shell" | "fetch_url";

export type PendingToolApproval = {
  id: string;
  actionId: string;
  toolCallId: string;
  toolName: ApprovalToolName;
  command?: string;
  cwd?: string;
  url?: string;
  method?: string;
};

export type ToolApprovalDecision = {
  approved: boolean;
  action: ActionLog;
};
export type ToolApprovalHandler = (
  input: ApprovalRequestInput,
) => Promise<ToolApprovalDecision>;

export type ApprovalRequestInput = {
  toolName: ApprovalToolName;
  toolCallId: string;
  command?: string;
  cwd?: string;
  url?: string;
  method?: string;
  signal?: AbortSignal;
};

type ApprovalRequestWithCallback = ApprovalRequestInput & {
  onChange: (approval: PendingToolApproval, status: "pending" | "approved" | "rejected", reason?: string) => void;
};

type QueuedApproval = {
  request: PendingToolApproval;
  action: ActionLog;
  resolve: (decision: ToolApprovalDecision) => void;
  onChange: ApprovalRequestWithCallback["onChange"];
  signal?: AbortSignal;
  abortHandler?: () => void;
};

export class ToolApprovalGate {
  private queue: QueuedApproval[] = [];
  private listeners = new Set<(pending: PendingToolApproval[]) => void>();

  constructor(private readonly tracker: ActionTracker) {}

  getPending(): PendingToolApproval[] {
    return this.queue.map(({ request }) => request);
  }

  subscribe(listener: (pending: PendingToolApproval[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getPending());
    return () => this.listeners.delete(listener);
  }

  request(input: ApprovalRequestWithCallback): Promise<ToolApprovalDecision> {
    const actionType: ActionType = input.toolName;
    const actionPath = input.toolName === "execute_shell"
      ? input.cwd ?? ""
      : input.url ?? "";
    const action = this.tracker.log({
      type: actionType,
      path: actionPath,
      details: {
        toolName: input.toolName,
        command: input.command,
        cwd: input.cwd,
        url: input.url,
        method: input.method,
      },
      status: "pending",
    });
    const request: PendingToolApproval = {
      id: action.id,
      actionId: action.id,
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      command: input.command,
      cwd: input.cwd,
      url: input.url,
      method: input.method,
    };

    return new Promise((resolve, reject) => {
      const queued: QueuedApproval = {
        request,
        action,
        resolve,
        onChange: input.onChange,
        signal: input.signal,
      };
      this.queue.push(queued);
      try {
        input.onChange(request, "pending");
      } catch (error: unknown) {
        this.queue = this.queue.filter((item) => item !== queued);
        if (input.signal && queued.abortHandler) {
          input.signal.removeEventListener("abort", queued.abortHandler);
        }
        const message = error instanceof Error ? error.message : String(error);
        this.tracker.updateDetails(action.id, { error: message });
        this.tracker.updateStatus(action.id, "failed");
        this.notify();
        reject(error);
        return;
      }
      if (input.signal) {
        queued.abortHandler = () => {
          this.decide(action.id, false, "Tool execution was interrupted.");
        };
        if (input.signal.aborted) {
          queued.abortHandler();
          return;
        }
        input.signal.addEventListener("abort", queued.abortHandler, {
          once: true,
        });
      }

      this.notify();
    });
  }

  decide(id: string, approved: boolean, reason?: string): boolean {
    const index = this.queue.findIndex((item) => item.request.id === id);
    if (index === -1) return false;

    const [queued] = this.queue.splice(index, 1);
    if (!queued) return false;

    if (queued.abortHandler && queued.signal) {
      queued.signal.removeEventListener("abort", queued.abortHandler);
    }

    this.tracker.updateStatus(
      queued.action.id,
      approved ? "approved" : "rejected",
      approved,
    );
    if (reason) {
      this.tracker.updateDetails(queued.action.id, { error: reason });
    }
    try {
      queued.onChange(
        queued.request,
        approved ? "approved" : "rejected",
        reason,
      );
    } finally {
      queued.resolve({ approved, action: queued.action });
      this.notify();
    }
    return true;
  }

  rejectPending(reason: string): void {
    for (const queued of [...this.queue]) {
      this.decide(queued.request.id, false, reason);
    }
  }

  private notify(): void {
    const pending = this.getPending();
    for (const listener of this.listeners) {
      listener(pending);
    }
  }
}
