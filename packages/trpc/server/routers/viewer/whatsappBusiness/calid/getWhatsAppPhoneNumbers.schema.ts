import { z } from "zod";

export const ZCalidGetWhatsAppPhoneNumbersInputSchema = z.object({
  calIdTeamId: z.number().optional(),
});

export type TCalidGetWhatsAppPhoneNumbersInput = z.infer<typeof ZCalidGetWhatsAppPhoneNumbersInputSchema>;