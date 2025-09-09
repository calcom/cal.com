import { z } from "zod";

export const ZCalIdVerifyEmailCodeInputSchema = z.object({
  calIdTeamId: z.number().optional(),
  code: z.string(),
  email: z.string(),
});

export type TCalIdVerifyEmailCodeInputSchema = z.infer<typeof ZCalIdVerifyEmailCodeInputSchema>;
