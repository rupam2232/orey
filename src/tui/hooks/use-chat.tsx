import { useState, useCallback, useRef, useEffect } from "react";
import { randomUUID } from "node:crypto";
import { stepCountIs, streamText } from "ai";
import { usePromptConfig } from "@/tui/providers/prompt-config";
import type { ModeType, Message, MessagePart } from "@/types";
import { ActionTracker } from "@/modes/agent/action-tracker";
import { ToolExecutor } from "@/modes/agent/tool-executor";
import { createAgentTools } from "@/modes/agent/agent-tools";
import { defaultAgentConfig, type ActionLog } from "@/modes/agent/types";
import { createWebTools } from "@/modes/plan/web-tools";
import { loadSession, saveSession, type SessionData } from "@/lib/session-storage";

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

export type ApprovalRequest = {
  tracker: ActionTracker;
  executor: ToolExecutor;
  pending: ActionLog[];
};

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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | null>(null);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const { aiModel, aiModelError } = usePromptConfig();
  const aiModelRef = useRef(aiModel);
  const aiModelErrorRef = useRef(aiModelError);
  aiModelRef.current = aiModel;
  aiModelErrorRef.current = aiModelError;

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSessionRef = useRef<SessionData | null>(null);
  const approvalRef = useRef<ApprovalRequest | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  useEffect(() => {
    const existing = loadSession(sessionId);
    if (existing) {
      activeSessionRef.current = existing;
      if (existing.messages.length > 0 && messages.length === 0) {
        setMessages(existing.messages);
      }
    }
  }, [sessionId, messages.length]);

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

  const resolveApproval = useCallback((approvedActionIds: string[]) => {
    const request = approvalRef.current;
    if (!request) return;

    approvalRef.current = null;
    setApproval(null);

    const approvedSet = new Set(approvedActionIds);
    for (const action of request.pending) {
      request.tracker.updateStatus(
        action.id,
        approvedSet.has(action.id) ? "approved" : "rejected",
        approvedSet.has(action.id),
      );
    }

    const { errors } = request.executor.applyApprovedFromTracker();
    request.executor.clearStaging();

    if (errors.length) {
      setError(new Error(errors.join("\n")));
    }
  }, []);

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
      const tracker = new ActionTracker();
      const executor = new ToolExecutor(tracker, config);

      const tools = {
        ...createAgentTools(executor),
        ...createWebTools(tracker),
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
        const formattedMessages = convertMessagesForStream(updatedMessagesWithUser);

        const result = streamText({
          model: currentModel,
          system: buildSystemPrompt(mode, process.cwd()),
          messages: formattedMessages,
          tools,
          stopWhen: stepCountIs(mode === "agent" ? 25 : mode === "plan" ? 10 : 5),
          abortSignal: controller.signal,
        });

        let currentAssistantParts: MessagePart[] = [];

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
          } else if (partType === "reasoning-delta" || partType === "reasoning") {
            const reasoningDelta =
              (part as { text?: string; reasoningDelta?: string; textDelta?: string }).text ||
              (part as { text?: string; reasoningDelta?: string; textDelta?: string }).reasoningDelta ||
              (part as { text?: string; reasoningDelta?: string; textDelta?: string }).textDelta ||
              "";
            const lastPart = currentAssistantParts[currentAssistantParts.length - 1];
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
            const args = (part as { input?: unknown; args?: unknown }).input ?? (part as { input?: unknown; args?: unknown }).args;
            currentAssistantParts.push({
              type: "tool-call",
              toolCallId,
              toolName,
              args,
              state: "call",
            });
          } else if (partType === "tool-result") {
            const toolCallId = (part as { toolCallId: string }).toolCallId;
            const resultOutput = (part as { output?: unknown; result?: unknown }).output ?? (part as { output?: unknown; result?: unknown }).result;
            const target = currentAssistantParts.find(
              (p: MessagePart) => p.type === "tool-call" && p.toolCallId === toolCallId,
            );

            if (target && target.type === "tool-call") {
              target.state = "output-available";
              target.output = resultOutput;
            }
          } else if (partType === "error") {
            const errVal = (part as { error?: unknown }).error;
            const errText = errVal instanceof Error ? errVal.message : String(errVal);
            const lastTc = [...currentAssistantParts]
              .reverse()
              .find((p: MessagePart) => p.type === "tool-call" && p.state === "call");

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

          setMessages([...updatedMessagesWithUser, updatedAssistantMsg]);
        }

        // Stage changes for approval if in agent mode
        if (mode === "agent") {
          const pending = tracker.getPendingMutations();
          executor.clearStaging();
          if (pending.length > 0) {
            const request: ApprovalRequest = { tracker, executor, pending };
            approvalRef.current = request;
            setApproval(request);
          }
        }

        const finalDurationMs = Date.now() - startTime;
        const finalAssistantMsg: Message = {
          id: assistantMessageId,
          role: "assistant",
          parts: currentAssistantParts,
          metadata: { mode, model, durationMs: finalDurationMs, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        };

        const finalMessages = [...updatedMessagesWithUser, finalAssistantMsg];
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
            ...messagesRef.current
              .find((m) => m.id === assistantMessageId)
              ?.parts.filter((p: MessagePart) => p.type !== "text") ?? [],
            { type: "text", text: `⚠️ Error: ${errObj.message}` },
          ],
          metadata: { mode, model, durationMs, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        };

        const finalFailedMessages = [...updatedMessagesWithUser, failedAssistantMsg];
        setMessages(finalFailedMessages);
        persistCurrentMessages(finalFailedMessages);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [persistCurrentMessages],
  );

  return {
    messages,
    status,
    error,
    submit,
    abort,
    interrupt,
    approval,
    resolveApproval,
  };
}
