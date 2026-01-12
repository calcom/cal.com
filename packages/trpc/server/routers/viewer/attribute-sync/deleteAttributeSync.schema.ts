import { z } from "zod";

export const deleteAttributeSyncSchema = z.object({
  id: z.string(),
});

export type ZDeleteAttributeSyncSchema = z.infer<typeof deleteAttributeSyncSchema>;
