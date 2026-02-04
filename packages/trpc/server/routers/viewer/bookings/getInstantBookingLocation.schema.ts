import { z } from "zod";

export type TInstantBookingInputSchema = {
  bookingUid: string;
};

export const ZInstantBookingInputSchema: z.ZodType<TInstantBookingInputSchema> = z.object({
  bookingUid: z.string(),
});
