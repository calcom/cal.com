import { z } from "zod";

export const ZVerifyPhoneNumberInputSchema = z.object({
  phoneNumber: z.string(),
  code: z.string(),
  teamId: z.number().optional(),
});

export type TVerifyPhoneNumberInputSchema = z.infer<typeof ZVerifyPhoneNumberInputSchema>;
