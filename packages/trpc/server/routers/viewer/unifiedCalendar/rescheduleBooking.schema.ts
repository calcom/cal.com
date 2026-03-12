import { z } from "zod";

import { ZUnifiedCalendarTargetCalendarSchema } from "./createBooking.schema";

export const ZUnifiedCalendarRescheduleBookingInputSchema = z.object({
  bookingId: z.number().int().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  title: z.string().trim().min(1).max(255).optional(),
  attendeeEmails: z.array(z.string().email()).optional(),
  targetCalendar: ZUnifiedCalendarTargetCalendarSchema.optional(),
  location: z.string().trim().min(1).max(1024).nullable().optional(),
  locationCredentialId: z.number().int().positive().nullable().optional(),
  note: z.string().trim().max(4000).nullable().optional(),
});

export const ZUnifiedCalendarRescheduleBookingOutputSchema = z.object({
  bookingId: z.number().int().positive(),
  bookingUid: z.string().min(1),
});

export type TUnifiedCalendarRescheduleBookingInput = z.infer<
  typeof ZUnifiedCalendarRescheduleBookingInputSchema
>;
export type TUnifiedCalendarRescheduleBookingOutput = z.infer<
  typeof ZUnifiedCalendarRescheduleBookingOutputSchema
>;
