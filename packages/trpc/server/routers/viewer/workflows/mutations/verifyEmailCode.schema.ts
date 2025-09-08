import { z } from "zod";

export const ZVerifyEmailCodeInputSchema = z.object({
  teamId: z.number().optional(),
  code: z.string(),
  email: z.string(),
});

export type TVerifyEmailCodeInputSchema = z.infer<typeof ZVerifyEmailCodeInputSchema>;
