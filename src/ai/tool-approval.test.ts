import { describe, expect, it } from "bun:test";
import { ActionTracker } from "./action-tracker";
import { ToolExecutor } from "./tool-executor";
import { defaultAgentConfig } from "./types";
import { ToolApprovalGate } from "./tool-approval";

describe("ToolApprovalGate", () => {
  it("records rejected requests with their parameters and resolves without approval", async () => {
    const tracker = new ActionTracker();
    const gate = new ToolApprovalGate(tracker);
    const states: string[] = [];

    const decisionPromise = gate.request({
      toolName: "execute_shell",
      toolCallId: "tool-call-1",
      command: "bun test",
      cwd: "D:\\workspace",
      onChange: (_request, status) => states.push(status),
    });

    const [request] = gate.getPending();
    expect(request?.toolName).toBe("execute_shell");
    expect(request?.cwd).toBe("D:\\workspace");
    expect(request?.command).toBe("bun test");
    expect(gate.decide(request!.id, false, "Rejected by user.")).toBe(true);

    const decision = await decisionPromise;
    expect(decision.approved).toBe(false);
    expect(decision.action.status).toBe("rejected");
    expect(decision.action.userApproved).toBe(false);
    expect(decision.action.details.command).toBe("bun test");
    expect(decision.action.details.cwd).toBe("D:\\workspace");
    expect(states).toEqual(["pending", "rejected"]);
    expect(gate.getPending()).toHaveLength(0);
  });

  it("records approved requests with the effective URL and method", async () => {
    const tracker = new ActionTracker();
    const gate = new ToolApprovalGate(tracker);
    const decisionPromise = gate.request({
      toolName: "fetch_url",
      toolCallId: "tool-call-2",
      url: "https://example.test/data",
      method: "DELETE",
      onChange: () => {},
    });

    const request = gate.getPending()[0]!;
    gate.decide(request.id, true);

    const decision = await decisionPromise;
    expect(decision.approved).toBe(true);
    expect(decision.action.status).toBe("approved");
    expect(decision.action.userApproved).toBe(true);
    expect(decision.action.details.url).toBe("https://example.test/data");
    expect(decision.action.details.method).toBe("DELETE");
  });

  it("rejects all outstanding requests on shutdown", async () => {
    const tracker = new ActionTracker();
    const gate = new ToolApprovalGate(tracker);
    const onChange = () => {};
    const first = gate.request({
      toolName: "fetch_url",
      toolCallId: "tool-call-2",
      url: "https://example.test/data",
      method: "GET",
      onChange,
    });
    const second = gate.request({
      toolName: "fetch_url",
      toolCallId: "tool-call-3",
      url: "https://example.test/other",
      method: "DELETE",
      onChange,
    });

    expect(gate.getPending()).toHaveLength(2);
    gate.rejectPending("Application closed before approval was provided.");

    const [firstDecision, secondDecision] = await Promise.all([first, second]);
    expect(firstDecision.approved).toBe(false);
    expect(secondDecision.approved).toBe(false);
    expect(firstDecision.action.userApproved).toBe(false);
    expect(secondDecision.action.userApproved).toBe(false);
    expect(firstDecision.action.details.url).toBe("https://example.test/data");
    expect(secondDecision.action.details.method).toBe("DELETE");
    expect(gate.getPending()).toHaveLength(0);
  });

  it("runs the approved shell command in its approved working directory", async () => {
    const tracker = new ActionTracker();
    const config = defaultAgentConfig();
    const executor = new ToolExecutor(tracker, config);
    const command =
      `"${process.execPath}" -e "process.stdout.write(process.cwd() + '|approval-shell-test')"`;
    const action = tracker.log({
      type: "execute_shell",
      path: config.codebasePath,
      details: {
        cwd: config.codebasePath,
        command,
      },
      status: "approved",
      userApproved: true,
    });
    executor.updateConfig({
      ...config,
      codebasePath: process.env.TEMP ?? config.codebasePath,
    });

    const output = await executor.executeShell(
      action.details.command!,
      action,
    );

    expect(output).toContain(config.codebasePath);
    expect(output).toContain("approval-shell-test");
    expect(action.status).toBe("executed");
    expect(action.userApproved).toBe(true);
  });
});
