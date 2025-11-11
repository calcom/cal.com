import { z } from "zod";

export const ZGuestEmailsVerificationRequiredSchema = z.object({
  userSessionEmail: z.string().optional(),
  emails: z.array(z.string()),
});

export type TGuestEmailsVerificationRequiredSchema = z.infer<typeof ZGuestEmailsVerificationRequiredSchema>;
