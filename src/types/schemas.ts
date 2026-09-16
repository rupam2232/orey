import z from "zod";
export const modeSchema = z.enum(["agent", "plan", "ask"]);
export const sessionsFileSchema = z.object({
  id: z.string(),
  goal: z.string(),
  cwd: z.string(),
});
