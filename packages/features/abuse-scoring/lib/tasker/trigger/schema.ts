import { z } from "zod";

export const abuseScoringTaskSchema = z.object({
  userId: z.number(),
  reason: z.string(),
});
