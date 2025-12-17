import { z } from "zod";

export type TVerifyPhoneNumberInputSchema = {
  phoneNumber: string;
  code: string;
  teamId?: number;
};

export const ZVerifyPhoneNumberInputSchema: z.ZodType<TVerifyPhoneNumberInputSchema> = z.object({
  phoneNumber: z.string(),
  code: z.string(),
  teamId: z.number().optional(),
});
