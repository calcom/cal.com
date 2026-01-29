import { z } from "zod";

export const ZTestSmtpConnectionInputSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1),
  smtpPassword: z.string().min(1),
  smtpSecure: z.boolean(),
});

export type TTestSmtpConnectionInput = z.infer<typeof ZTestSmtpConnectionInputSchema>;
