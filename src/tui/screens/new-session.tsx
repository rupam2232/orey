import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router";
import { modeSchema } from "@/types/schemas";
import { createSessionRecord } from "@/lib/session-storage";
import { SessionShell } from "../components/session-shell";
import { UserMessage } from "../components/messages";
import { useToast } from "../providers/toast";

const newSessionStateSchema = z.object({
  message: z.string(),
  mode: modeSchema,
  model: z.string(),
  cwd: z.string().optional().default(() => process.cwd()),
});

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasStartedRef = useRef(false);
  const toast = useToast();

  const state = useMemo(() => {
    const parsed = newSessionStateSchema.safeParse(location.state);
    return parsed.success ? parsed.data : null;
  }, [location.state]);

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  useEffect(() => {
    if (!state || hasStartedRef.current) return;

    hasStartedRef.current = true;

    let ignore = false;
    const initSession = () => {
      try {
        if (ignore) return;
        const session = createSessionRecord(state.message, state.cwd);

        navigate(`/sessions/${session.id}`, {
          replace: true,
          state: {
            session,
            initialPrompt: {
              message: state.message,
              mode: state.mode,
              model: state.model,
            },
          },
        });
      } catch (err: any) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message: err?.message || "Failed to create session",
        });
        navigate("/", { replace: true });
      }
    };

    initSession();

    return () => {
      ignore = true;
    };
  }, [state, navigate, toast]);

  if (!state) return null;

  return (
    <SessionShell onSubmit={() => {}} inputDisabled loading>
      <UserMessage message={state.message} mode={state.mode} />
    </SessionShell>
  );
}
