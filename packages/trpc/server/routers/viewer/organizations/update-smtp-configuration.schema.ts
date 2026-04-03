import { stripCRLF } from "@calcom/lib/sanitizeCRLF";
import { validateSmtpHost } from "@calcom/lib/validateSmtpHost";
import { z } from "zod";

export const ZUpdateSmtpConfigurationInputSchema = z.object({
  fromEmail: z
    .string()
    .email()
    .optional()
    .transform((val) => val && stripCRLF(val)),
  fromName: z
    .string()
    .optional()
    .transform((val) => (val ? stripCRLF(val) : val))
    .refine((val) => val === undefined || val.length > 0, { message: "From name cannot be empty" }),
  smtpHost: z
    .string()
    .optional()
    .transform((val) => (val ? stripCRLF(val) : val))
    .refine((val) => val === undefined || val.length > 0, { message: "SMTP host cannot be empty" })
    .refine((val) => !val || validateSmtpHost(val), { message: "SMTP host must be a public address" }),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z
    .string()
    .optional()
    .transform((val) => (val ? stripCRLF(val) : val))
    .refine((val) => val === undefined || val.length > 0, { message: "SMTP username cannot be empty" }),
  smtpPassword: z
    .string()
    .optional()
    .transform((val) => (val ? stripCRLF(val) : val))
    .refine((val) => val === undefined || val.length > 0, { message: "SMTP password cannot be empty" }),
  smtpSecure: z.boolean().optional(),
});

export type TUpdateSmtpConfigurationInput = z.infer<typeof ZUpdateSmtpConfigurationInputSchema>;
