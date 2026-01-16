import { z } from "zod";

export type TGetBookingAttendeesInputSchema = {
  seatReferenceUid: string;
};

export const ZGetBookingAttendeesInputSchema: z.ZodType<TGetBookingAttendeesInputSchema> = z.object({
  seatReferenceUid: z.string().uuid(),
});
