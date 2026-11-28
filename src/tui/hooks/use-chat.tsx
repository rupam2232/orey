import { useState, useCallback, useRef, useEffect } from "react";
import { randomUUID } from "node:crypto";
import { stepCountIs, streamText } from "ai";
import { usePromptConfig } from "@/tui/providers/prompt-config";
import type { ModeType, Message, MessagePart } from "@/types";
import { getSessionActionContext } from "@/ai/session-actions";
import { createAgentTools, createWebTools } from "@/ai/tools";
import { defaultAgentConfig } from "@/ai/types";
import type {
  PendingToolApproval,
  ToolApprovalHandler,
} from "@/ai/tool-approval";
import {
  loadSession,
  saveSession,
  type SessionData,
} from "@/lib/session-storage";
import { formatPatch } from "@/utils/diff-view";

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

type MutationToolName =
  | "create_file"
  | "modify_file"
  | "delete_file"
  | "create_folder";

function isMutationToolName(name: string): name is MutationToolName {
  return (
    name === "create_file" ||
    name === "modify_file" ||
    name === "delete_file" ||
    name === "create_folder"
  );
}

function rejectInterruptedApprovals(
  messages: Message[],
  activeActionIds: Set<string>,
): { messages: Message[]; changed: boolean } {
  let changed = false;
  const updatedMessages = messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (
        part.type !== "tool-call" ||
        part.approval?.status !== "pending" ||
        activeActionIds.has(part.approval.actionId)
      ) {
        return part;
      }

      changed = true;
      return {
        ...part,
        approval: {
          ...part.approval,
          status: "rejected" as const,
          reason: "Application closed before approval was provided.",
        },
      };
    }),
  }));
  return { messages: updatedMessages, changed };
}

function persistableToolArgs(toolName: string, args: unknown): unknown {
  if (!isMutationToolName(toolName) || !args || typeof args !== "object") {
    return args;
  }

  const path = (args as { path?: unknown }).path;
  return typeof path === "string" ? { path } : {};
}

function buildSystemPrompt(mode: ModeType, cwd: string): string {
  const base = `Workspace root: ${cwd}\nToday's date: ${new Date().toLocaleDateString()}`;

  if (mode === "agent") {
    return `${base}
You are Orey, an elite autonomous developer assistant working directly inside the user's local terminal.
You have tools to read files, search the codebase, create files, modify files, and run shell commands.
- Read and inspect files to understand the codebase thoroughly before making changes.
- Perform edits cleanly and accurately.
- Provide clear, concise explanations of what you did.`;
  }

  if (mode === "plan") {
    return `${base}
You are Orey in Plan Mode, an expert software architect.
Analyze the user's goal and the current codebase using read/search tools.
Provide a clear, well-structured, actionable step-by-step implementation plan (1-10 steps).
Do not perform file mutations.`;
  }

  return `${base}
You are Orey in Ask Mode, an expert software engineer and codebase intelligence assistant.
Answer questions accurately and concisely using your search and read tools.
Provide clear code snippets, markdown formatting, and file references. Do not perform file mutations.`;
}

function convertMessagesForStream(messages: Message[]) {
  const result: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const m of messages) {
    if (m.role === "user" || m.role === "assistant") {
      const text = m.parts
        .filter((p: MessagePart) => p.type === "text")
        .map((p: MessagePart) => (p.type === "text" ? p.text : ""))
        .join("\n");
      if (text.trim()) {
        result.push({ role: m.role, content: text });
      }
    }
  }

  return result;
}

export function useChat(sessionId: string, initialMessages: Message[] = []) {
  const [actionContext] = useState(() =>
    getSessionActionContext(sessionId, defaultAgentConfig()),
  );
  const [messages, setMessages] = useState<Message[]>(() => {
    const activeIds = new Set(
      actionContext.approvalGate.getPending().map((request) => request.actionId),
    );
    return rejectInterruptedApprovals(initialMessages, activeIds).messages;
  });
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingToolApproval[]>(
    () => actionContext.approvalGate.getPending(),
  );
  const { aiModel, aiModelError } = usePromptConfig();
  const aiModelRef = useRef(aiModel);
  const aiModelErrorRef = useRef(aiModelError);
  aiModelRef.current = aiModel;
  aiModelErrorRef.current = aiModelError;

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSessionRef = useRef<SessionData | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  useEffect(
    () => actionContext.approvalGate.subscribe(setPendingApprovals),
    [actionContext],
  );

  useEffect(() => {
    const existing = loadSession(sessionId);
    if (existing) {
      activeSessionRef.current = existing;
      const activeIds = new Set(
        actionContext.approvalGate
          .getPending()
          .map((request) => request.actionId),
      );
      const reconciled = rejectInterruptedApprovals(existing.messages, activeIds);
      if (reconciled.changed) {
        existing.messages = reconciled.messages;
        saveSession(existing);
      }
      if (existing.messages.length > 0 && messages.length === 0) {
        setMessages(existing.messages);
        messagesRef.current = existing.messages;
      }
    }
  }, [actionContext, sessionId, messages.length]);

  const persistCurrentMessages = useCallback(
    (nextMessages: Message[]) => {
      let session = activeSessionRef.current;
      if (!session) {
        const firstUserText =
          nextMessages[0]?.parts.find((p: MessagePart) => p.type === "text");
        const goalText =
          firstUserText && firstUserText.type === "text"
            ? firstUserText.text
            : "Session";

        session = loadSession(sessionId) || {
          id: sessionId,
          goal: goalText,
          cwd: process.cwd(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: nextMessages,
        };
      }
      session.messages = nextMessages;
      saveSession(session);
      activeSessionRef.current = session;
    },
    [sessionId],
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("ready");
  }, []);

  const interrupt = useCallback(() => {
    abort();
  }, [abort]);

  const submit = useCallback(
    async (params: { userText: string; mode: ModeType; model: string }) => {
      const { userText, mode, model } = params;
      if (!userText.trim()) return;

      const now = new Date().toISOString();
      const userMessage: Message = {
        id: "user-" + randomUUID(),
        role: "user",
        parts: [{ type: "text", text: userText }],
        metadata: { mode, model, createdAt: now, updatedAt: now },
      };

      const assistantMessageId = "assistant-" + randomUUID();
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        parts: [],
        metadata: { mode, model },
      };

      const updatedMessagesWithUser = [...messagesRef.current, userMessage];
      const nextMessages = [...updatedMessagesWithUser, initialAssistantMessage];

      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      persistCurrentMessages(nextMessages);
      setStatus("streaming");
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const startTime = Date.now();

      // Configure tools and executor directly from src/modes
      const config = defaultAgentConfig();
      if (mode === "ask" || mode === "plan") {
        config.tools.allowFileCreation = false;
        config.tools.allowFileModification = false;
        config.tools.allowFolderCreation = false;
        config.tools.allowShellExecution = false;
      }
      const actionContext = getSessionActionContext(sessionId, config);
      const { tracker, executor } = actionContext;
      setPendingApprovals(actionContext.approvalGate.getPending());
      let currentAssistantParts: MessagePart[] = [];
      const approvalStatesByToolCallId = new Map<
        string,
        NonNullable<Extract<MessagePart, { type: "tool-call" }>["approval"]>
      >();

      const updateApprovalMessage = (
        approvalRequest: PendingToolApproval,
        approvalStatus: "pending" | "approved" | "rejected",
        reason?: string,
      ) => {
        const approvalState = {
          actionId: approvalRequest.actionId,
          status: approvalStatus,
          reason,
        };
        approvalStatesByToolCallId.set(
          approvalRequest.toolCallId,
          approvalState,
        );
        const target = currentAssistantParts.find(
          (part) =>
            part.type === "tool-call" &&
            part.toolCallId === approvalRequest.toolCallId,
        );
        if (target?.type === "tool-call") {
          target.approval = approvalState;
        } else {
          const toolArgs =
            approvalRequest.toolName === "execute_shell"
              ? { command: approvalRequest.command }
              : {
                  url: approvalRequest.url,
                  method: approvalRequest.method,
                };
          currentAssistantParts.push({
            type: "tool-call",
            toolCallId: approvalRequest.toolCallId,
            toolName: approvalRequest.toolName,
            args: toolArgs,
            state: "call",
            approval: approvalState,
          });
        }

        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          parts: [...currentAssistantParts],
          metadata: { mode, model, updatedAt: new Date().toISOString() },
        };
        const nextMessages = [...updatedMessagesWithUser, assistantMessage];
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
        persistCurrentMessages(nextMessages);
      };

      const requestApproval: ToolApprovalHandler = (input) =>
        actionContext.approvalGate.request({
          ...input,
          onChange: updateApprovalMessage,
        });

      const tools = {
        ...createAgentTools(executor, requestApproval),
        ...createWebTools(tracker, requestApproval),
      };

      try {
        const currentModel = aiModelRef.current;
        const currentError = aiModelErrorRef.current;
        if (currentError) {
          throw new Error(currentError);
        }
        if (!currentModel) {
          throw new Error(
            "No provider selected. Use /models to choose a provider and model.",
          );
        }
        const formattedMessages = convertMessagesForStream(
          updatedMessagesWithUser,
        );

        const result = streamText({
          model: currentModel,
          system: buildSystemPrompt(mode, process.cwd()),
          messages: formattedMessages,
          tools,
          stopWhen: stepCountIs(
            mode === "agent" ? 25 : mode === "plan" ? 10 : 5,
          ),
          abortSignal: controller.signal,
        });

        for await (const part of result.stream) {
          if (controller.signal.aborted) break;

          const partType = (part as { type: string }).type;

          if (partType === "text-delta") {
            const textDelta =
              (part as { text?: string; textDelta?: string }).text ||
              (part as { text?: string; textDelta?: string }).textDelta ||
              "";
            const lastPart = currentAssistantParts[currentAssistantParts.length - 1];
            if (lastPart && lastPart.type === "text") {
              lastPart.text += textDelta;
            } else {
              currentAssistantParts.push({ type: "text", text: textDelta });
            }
          } else if (
            partType === "reasoning-delta" ||
            partType === "reasoning"
          ) {
            const reasoningDelta =
              (
                part as {
                  text?: string;
                  reasoningDelta?: string;
                  textDelta?: string;
                }
              ).text ||
              (
                part as {
                  text?: string;
                  reasoningDelta?: string;
                  textDelta?: string;
                }
              ).reasoningDelta ||
              (
                part as {
                  text?: string;
                  reasoningDelta?: string;
                  textDelta?: string;
                }
              ).textDelta ||
              "";
            const lastPart =
              currentAssistantParts[currentAssistantParts.length - 1];
            if (lastPart && lastPart.type === "reasoning") {
              lastPart.text += reasoningDelta;
            } else {
              currentAssistantParts.push({
                type: "reasoning",
                text: reasoningDelta,
              });
            }
          } else if (partType === "tool-call") {
            const toolCallId = (part as { toolCallId: string }).toolCallId;
            const toolName = (part as { toolName: string }).toolName;
            const args =
              (part as { input?: unknown; args?: unknown }).input ??
              (part as { input?: unknown; args?: unknown }).args;
            const existing = currentAssistantParts.find(
              (item) =>
                item.type === "tool-call" && item.toolCallId === toolCallId,
            );
            const approvalState = approvalStatesByToolCallId.get(toolCallId);
            if (existing?.type === "tool-call") {
              existing.args = persistableToolArgs(toolName, args);
              existing.approval = approvalState;
            } else {
              currentAssistantParts.push({
                type: "tool-call",
                toolCallId,
                toolName,
                args: persistableToolArgs(toolName, args),
                state: "call",
                approval: approvalState,
              });
            }
          } else if (partType === "tool-result") {
            const toolCallId = (part as { toolCallId: string }).toolCallId;
            const resultOutput =
              (part as { output?: unknown; result?: unknown }).output ??
              (part as { output?: unknown; result?: unknown }).result;
            const target = currentAssistantParts.find(
              (p: MessagePart) =>
                p.type === "tool-call" && p.toolCallId === toolCallId,
            );

            if (target && target.type === "tool-call") {
              target.state = "output-available";
              target.output = resultOutput;
              if (isMutationToolName(target.toolName)) {
                const args =
                  target.args && typeof target.args === "object"
                    ? (target.args as { path?: unknown })
                    : {};
                const actionType = target.toolName;
                const action = tracker.findLatest(
                  actionType,
                  String(args.path ?? ""),
                );
                if (action) {
                  target.change = {
                    type: actionType,
                    path: action.path,
                    actionId: action.id,
                    patch:
                      actionType === "create_folder"
                        ? undefined
                        : formatPatch(
                            action.path,
                            action.details.before ?? "",
                            action.details.after ?? "",
                          ),
                  };
                }
              }
            }
          } else if (partType === "tool-error") {
            const toolCallId = (part as { toolCallId: string }).toolCallId;
            const errVal = (part as { error?: unknown }).error;
            const target = currentAssistantParts.find(
              (p: MessagePart) =>
                p.type === "tool-call" && p.toolCallId === toolCallId,
            );
            if (target && target.type === "tool-call") {
              target.state = "output-error";
              target.errorText =
                errVal instanceof Error ? errVal.message : String(errVal);
            }
          } else if (partType === "error") {
            const errVal = (part as { error?: unknown }).error;
            const errText =
              errVal instanceof Error ? errVal.message : String(errVal);
            const lastTc = [...currentAssistantParts]
              .reverse()
              .find(
                (p: MessagePart) =>
                  p.type === "tool-call" && p.state === "call",
              );

            if (lastTc && lastTc.type === "tool-call") {
              lastTc.state = "output-error";
              lastTc.errorText = errText;
            }
          }

          const durationMs = Date.now() - startTime;
          const updatedAssistantMsg: Message = {
            id: assistantMessageId,
            role: "assistant",
            parts: [...currentAssistantParts],
            metadata: { mode, model, durationMs },
          };

          const nextStreamMessages = [
            ...updatedMessagesWithUser,
            updatedAssistantMsg,
          ];
          messagesRef.current = nextStreamMessages;
          setMessages(nextStreamMessages);
          if (
            partType === "tool-call" &&
            (part as { toolCallId: string }).toolCallId &&
            approvalStatesByToolCallId.has(
              (part as { toolCallId: string }).toolCallId,
            )
          ) {
            persistCurrentMessages(nextStreamMessages);
          }
        }

        const finalDurationMs = Date.now() - startTime;
        const finalAssistantMsg: Message = {
          id: assistantMessageId,
          role: "assistant",
          parts: currentAssistantParts,
          metadata: {
            mode,
            model,
            durationMs: finalDurationMs,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        const finalMessages = [...updatedMessagesWithUser, finalAssistantMsg];
        messagesRef.current = finalMessages;
        setMessages(finalMessages);
        persistCurrentMessages(finalMessages);
        setStatus("ready");
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          setStatus("ready");
          return;
        }

        const errObj = err instanceof Error ? err : new Error(String(err));
        setError(errObj);
        setStatus("error");

        const durationMs = Date.now() - startTime;
        const failedAssistantMsg: Message = {
          id: assistantMessageId,
          role: "assistant",
          parts: [
            ...(messagesRef.current
              .find((m) => m.id === assistantMessageId)
              ?.parts.filter((p: MessagePart) => p.type !== "text") ?? []),
            { type: "text", text: `⚠️ Error: ${errObj.message}` },
          ],
          metadata: {
            mode,
            model,
            durationMs,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        const finalFailedMessages = [
          ...updatedMessagesWithUser,
          failedAssistantMsg,
        ];
        messagesRef.current = finalFailedMessages;
        setMessages(finalFailedMessages);
        persistCurrentMessages(finalFailedMessages);
      } finally {
        executor.clearStaging();
        abortControllerRef.current = null;
      }
    },
    [persistCurrentMessages, sessionId],
  );

  const revertAction = useCallback(
    (actionId: string) => {
      if (!actionContext) {
        return;
      }

      let revertError: string | undefined;
      try {
        actionContext.executor.revertAction(actionId);
      } catch (error: unknown) {
        revertError = error instanceof Error ? error.message : String(error);
      }

      const nextMessages = messagesRef.current.map((message) => ({
        ...message,
        parts: message.parts.map((part) => {
          if (part.type !== "tool-call" || part.change?.actionId !== actionId) {
            return part;
          }
          return {
            ...part,
            change: {
              ...part.change,
              reverted: revertError === undefined,
              revertError,
            },
          };
        }),
      }));
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      persistCurrentMessages(nextMessages);
    },
    [actionContext, persistCurrentMessages],
  );

  const resolveToolApproval = useCallback(
    (approvalId: string, approved: boolean) => {
      actionContext.approvalGate.decide(
        approvalId,
        approved,
        approved ? undefined : "Rejected by user.",
      );
    },
    [actionContext],
  );

  const isRevertAvailable = useCallback((actionId: string) => {
    const action = actionContext?.tracker
      .getActions()
      .find((item) => item.id === actionId);
    return (
      action != null && !action.reverted && action.details.reversible !== false
    );
  }, [actionContext]);

  return {
    messages,
    status,
    error,
    submit,
    abort,
    interrupt,
    pendingApprovals,
    resolveToolApproval,
    revertAction,
    isRevertAvailable,
  };
}
