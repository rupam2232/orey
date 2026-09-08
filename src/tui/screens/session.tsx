import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { useKeyboard } from "@opentui/react";
import type { ModeType, Message, MessagePart } from "@/types";
import { SessionShell } from "../components/session-shell";
import {
  UserMessage,
  BotMessage,
  ErrorMessage,
} from "../components/messages";
import { useChat } from "../hooks/use-chat";
import { usePromptConfig } from "../providers/prompt-config";
import { useToast } from "../providers/toast";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { loadSession, type SessionData } from "@/lib/session-storage";
import { ApprovalCard } from "../components/approval-card";

const initialPromptSchema = z.object({
  message: z.string(),
  mode: z.custom<ModeType>(),
  model: z.string(),
});

type InitialPrompt = z.infer<typeof initialPromptSchema>;

const sessionLocationSchema = z.object({
  session: z.custom<SessionData>(
    (val) =>
      val != null &&
      typeof val === "object" &&
      "messages" in val &&
      Array.isArray((val as Record<string, unknown>).messages),
  ),
  initialPrompt: initialPromptSchema.optional(),
});

function ChatMessage({ msg, isStreaming }: { msg: Message; isStreaming: boolean }) {
  if (msg.role === "user") {
    const text = msg.parts
      .filter((p: MessagePart) => p.type === "text")
      .map((p: MessagePart) => (p.type === "text" ? p.text : ""))
      .join("\n");

    return <UserMessage message={text} mode={msg.metadata?.mode ?? "agent"} />;
  }

  return (
    <BotMessage
      parts={msg.parts}
      model={msg.metadata?.model ?? "unknown"}
      mode={msg.metadata?.mode ?? "agent"}
      durationMs={msg.metadata?.durationMs}
      streaming={isStreaming}
    />
  );
}

function SessionChat({
  session,
  initialPrompt,
}: {
  session: SessionData;
  initialPrompt?: InitialPrompt;
}) {
  const [initialMessages] = useState<Message[]>(() => session.messages || []);
  const { model, mode } = usePromptConfig();
  const { isTopLayer } = useKeyboardLayer();
  const { messages, status, submit, abort, interrupt, error, approval, resolveApproval } =
    useChat(session.id, initialMessages);
  const hasSubmittedInitialPromptRef = useRef(false);

  useEffect(() => {
    return () => void abort();
  }, [abort]);

  useKeyboard((key) => {
    if (key.name === "escape" && isTopLayer("base") && status === "streaming") {
      key.preventDefault();
      interrupt();
    }
  });

  useEffect(() => {
    if (!initialPrompt || hasSubmittedInitialPromptRef.current) return;

    hasSubmittedInitialPromptRef.current = true;

    void submit({
      userText: initialPrompt.message,
      mode: initialPrompt.mode,
      model: initialPrompt.model,
    });
  }, [initialPrompt, submit]);

  return (
    <SessionShell
      onSubmit={(text) => {
        submit({ userText: text, mode, model });
      }}
      loading={status === "submitted" || status === "streaming"}
      interruptible={status === "submitted" || status === "streaming"}
      inputDisabled={approval != null}
    >
      {messages.map((msg, i) => (
        <ChatMessage key={msg.id} msg={msg} isStreaming={messages.length === i + 1 && status === "streaming"} />
      ))}
      {error && <ErrorMessage message={error.message} />}
      {approval && (
        <ApprovalCard
          pending={approval.pending}
          onComplete={(ids) => resolveApproval(ids)}
        />
      )}
    </SessionShell>
  );
}

export function Session() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(
    prefetched?.session ?? null,
  );

  useEffect(() => {
    if (prefetched?.session) return;

    if (!id) {
      navigate("/", { replace: true });
      return;
    }

    const loaded = loadSession(id);
    if (!loaded) {
      toast.show({
        variant: "error",
        message: "Session not found",
      });
      navigate("/", { replace: true });
      return;
    }

    setSession(loaded);
  }, [id, toast, navigate, prefetched]);

  if (!session) {
    return <SessionShell onSubmit={() => {}} inputDisabled loading />;
  }

  return (
    <SessionChat
      key={session.id}
      session={session}
      initialPrompt={prefetched?.initialPrompt}
    />
  );
}
