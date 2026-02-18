import { z } from "zod";

export const applySyncSchema = z.object({
  syncId: z.string(),
});

export type ZApplySyncSchema = z.infer<typeof applySyncSchema>;
