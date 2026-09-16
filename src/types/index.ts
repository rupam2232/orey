export type ModeType = "agent" | "plan" | "ask";

export type ModeOption = {
  id: ModeType;
  name: string;
  description: string;
};

export type MessagePart =
    | { type: "text"; text: string }
    | { type: "reasoning"; text: string }
    | {
        type: "tool-call";
        toolCallId: string;
        toolName: string;
        args: unknown;
        state: "call" | "output-available" | "output-error";
        output?: unknown;
        errorText?: string;
    };

export type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    parts: MessagePart[];
    metadata?: {
        mode?: ModeType;
        model?: string;
        durationMs?: number;
        createdAt?: string;
        updatedAt?: string;
    };
};