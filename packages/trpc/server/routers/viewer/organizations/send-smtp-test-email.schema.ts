import { z } from "zod";

export const ZSendSmtpTestEmailInputSchema = z.object({
  toEmail: z.string().email(),
});

export type TSendSmtpTestEmailInputSchema = z.infer<typeof ZSendSmtpTestEmailInputSchema>;
