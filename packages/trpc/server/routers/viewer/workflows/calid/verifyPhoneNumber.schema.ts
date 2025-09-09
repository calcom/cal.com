import { z } from "zod";

export const ZCalIdVerifyPhoneNumberInputSchema = z.object({
  phoneNumber: z.string(),
  code: z.string(),
  calIdTeamId: z.number().optional(),
});

export type TCalIdVerifyPhoneNumberInputSchema = z.infer<typeof ZCalIdVerifyPhoneNumberInputSchema>;
