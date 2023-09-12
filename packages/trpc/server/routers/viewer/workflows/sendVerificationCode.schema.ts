import { z } from "zod";

export const ZSendVerificationCodeInputSchema = z.object({
  phoneNumber: z.string(),
});

export type TSendVerificationCodeInputSchema = z.infer<typeof ZSendVerificationCodeInputSchema>;
