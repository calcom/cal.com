import { z } from "zod";

export type TVerifyBookingEmailInputSchema = {
  bookingUid: string;
  email: string;
};

export const ZVerifyBookingEmailInputSchema: z.ZodType<TVerifyBookingEmailInputSchema> = z.object({
  bookingUid: z.string(),
  email: z.string().email(),
});

export type TVerifyBookingEmailOutputSchema = {
  isValid: boolean;
};
