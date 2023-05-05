import { z } from "zod";

export const ZEditInputSchema = z.object({
  id: z.string(),
  note: z.string().optional().nullish(),
  expiresAt: z.date().optional(),
});

export type TEditInputSchema = z.infer<typeof ZEditInputSchema>;
