import { z } from "zod";

export const ZGetBookingAttendeesInputSchema = z.object({ seatReferenceUid: z.string().uuid() });

export type TGetBookingAttendeesInputSchema = z.infer<typeof ZGetBookingAttendeesInputSchema>;
