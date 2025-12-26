import { z } from "zod";

export type TGetBookingAttendeesInputSchema = {
  seatReferenceUid: string;
};

export const ZGetBookingAttendeesInputSchema = z.object({
  seatReferenceUid: z.string().uuid(),
});
