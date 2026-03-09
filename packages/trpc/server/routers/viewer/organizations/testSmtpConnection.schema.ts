import { stripCRLF } from "@calcom/lib/sanitizeCRLF";
import { validateSmtpHost } from "@calcom/lib/validateSmtpHost";
import { z } from "zod";

export const ZTestSmtpConnectionInputSchema = z.object({
  configId: z.number().optional(),
  smtpHost: z
    .string()
    .min(1)
    .transform(stripCRLF)
    .refine(validateSmtpHost, { message: "SMTP host must be a public address" }),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1).optional().transform((val) => val && stripCRLF(val)),
  smtpPassword: z.string().min(1).optional().transform((val) => val && stripCRLF(val)),
  smtpSecure: z.boolean(),
});

export type TTestSmtpConnectionInput = z.infer<typeof ZTestSmtpConnectionInputSchema>;
