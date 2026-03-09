import { stripCRLF } from "@calcom/lib/sanitizeCRLF";
import { validateSmtpHost } from "@calcom/lib/validateSmtpHost";
import { z } from "zod";

export const ZCreateSmtpConfigurationInputSchema = z.object({
  fromEmail: z.string().email().transform(stripCRLF),
  fromName: z.string().min(1).transform(stripCRLF),
  smtpHost: z
    .string()
    .min(1)
    .transform(stripCRLF)
    .refine(validateSmtpHost, { message: "SMTP host must be a public address" }),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z
    .string()
    .transform(stripCRLF)
    .refine((value) => value.length > 0, { message: "SMTP username is required" }),
  smtpPassword: z
    .string()
    .transform(stripCRLF)
    .refine((value) => value.length > 0, { message: "SMTP password is required" }),
  smtpSecure: z.boolean().default(true),
});

export type TCreateSmtpConfigurationInput = z.infer<typeof ZCreateSmtpConfigurationInputSchema>;
