import { stripCRLF } from "@calcom/lib/sanitizeCRLF";
import { z } from "zod";

export const ZTestSmtpConnectionInputSchema = z.object({
  configId: z.number().optional(),
  smtpHost: z.string().min(1).transform(stripCRLF),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1).optional(),
  smtpPassword: z.string().min(1).optional(),
  smtpSecure: z.boolean(),
});

export type TTestSmtpConnectionInput = z.infer<typeof ZTestSmtpConnectionInputSchema>;
