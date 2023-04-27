import { z } from "zod";

export const ZCreateInputSchema = z.object({
  note: z.string().optional().nullish(),
  expiresAt: z.date().optional().nullable(),
  neverExpires: z.boolean().optional(),
  appId: z.string().optional().nullable(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
