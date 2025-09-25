import { z } from "zod";

export const ZCalIdSendVerificationCodeInputSchema = z.object({
  phoneNumber: z.string(),
});

export type TCalIdSendVerificationCodeInputSchema = z.infer<typeof ZCalIdSendVerificationCodeInputSchema>;
