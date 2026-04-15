import { z } from "zod";

export const ZCreateCustomReasonSchema = z.object({
  emoji: z.string().min(1).max(10),
  reason: z.string().min(1).max(50),
});

export type TCreateCustomReasonSchema = z.infer<typeof ZCreateCustomReasonSchema>;
