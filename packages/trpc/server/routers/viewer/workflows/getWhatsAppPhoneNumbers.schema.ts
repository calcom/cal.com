import { z } from "zod";

export const ZCalidGetWhatsAppPhoneNumbersInputSchema = z.object({
  credentialId: z.number().optional(),
  calIdTeamId: z.number().optional(),
});

export type TCalidGetWhatsAppPhoneNumbersInput = z.infer<typeof ZCalidGetWhatsAppPhoneNumbersInputSchema>;