import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router";
import { modeSchema, sessionsFileSchema } from "../../types/schemas";
import { randomUUID } from "node:crypto";
import { ensureOreyBaseDirs, OREY_PATHS } from "../../constants/paths";
import { readFileSync, writeFileSync } from "node:fs";

const newSessionStateSchema = z.object({
  message: z.string(),
  mode: modeSchema,
  model: z.string(),
  cwd: z.string(),
});

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasStartedRef = useRef(false);
  const SESSIONS_FILE_PATH = OREY_PATHS.sessionsFile;

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
    const createSession = async () => {
      try {
        if (ignore) return;
        const id = "orey-session-" + randomUUID();
        const parsedSession = sessionsFileSchema.safeParse({
          id,
          goal: state.message,
          cwd: state.cwd,
        });
        if (!parsedSession.success) {
          throw new Error(
            "Failed to create session: " + parsedSession.error.message,
          );
        }
        ensureOreyBaseDirs();
        const sessionsData = JSON.parse(
          readFileSync(SESSIONS_FILE_PATH, "utf-8"),
        );

        sessionsData.push(parsedSession.data);
        writeFileSync(
          SESSIONS_FILE_PATH,
          JSON.stringify(sessionsData, null, 2),
        );
        navigate(`/sessions/${parsedSession.data.id}`, {
          replace: true,
          state: { session: parsedSession.data, initialPrompt: state },
        });
      } catch (err) {
        if (ignore) return;
        navigate("/", { replace: true });
      }
    };
    createSession();
    return () => {
      ignore = true;
    };
  }, [state, navigate]);

  if (!state) return null;

  return <></>;
}
