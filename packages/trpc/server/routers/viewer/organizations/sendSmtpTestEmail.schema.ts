import { z } from "zod";

export const ZSendSmtpTestEmailInputSchema = z.object({
  id: z.number(),
});

export type TSendSmtpTestEmailInputSchema = z.infer<typeof ZSendSmtpTestEmailInputSchema>;
