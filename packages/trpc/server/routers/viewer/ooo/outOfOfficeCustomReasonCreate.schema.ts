import { z } from "zod";

export const ZOutOfOfficeCustomReasonCreateSchema = z.object({
  emoji: z.string().min(1).max(10),
  reason: z.string().min(1).max(100),
});

export type TOutOfOfficeCustomReasonCreateSchema = z.infer<typeof ZOutOfOfficeCustomReasonCreateSchema>;
