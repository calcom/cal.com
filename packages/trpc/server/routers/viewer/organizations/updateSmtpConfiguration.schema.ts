import { stripCRLF } from "@calcom/lib/sanitizeCRLF";
import { validateSmtpHost } from "@calcom/lib/validateSmtpHost";
import { z } from "zod";

export const ZUpdateSmtpConfigurationInputSchema = z.object({
  id: z.number(),
  fromEmail: z
    .string()
    .email()
    .optional()
    .transform((val) => val && stripCRLF(val)),
  fromName: z
    .string()
    .min(1)
    .optional()
    .transform((val) => val && stripCRLF(val)),
  smtpHost: z
    .string()
    .min(1)
    .optional()
    .transform((val) => val && stripCRLF(val))
    .refine((val) => !val || validateSmtpHost(val), { message: "SMTP host must be a public address" }),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z
    .string()
    .min(1)
    .optional()
    .transform((val) => val && stripCRLF(val)),
  smtpPassword: z
    .string()
    .min(1)
    .optional()
    .transform((val) => val && stripCRLF(val)),
  smtpSecure: z.boolean().optional(),
});

export type TUpdateSmtpConfigurationInput = z.infer<typeof ZUpdateSmtpConfigurationInputSchema>;
