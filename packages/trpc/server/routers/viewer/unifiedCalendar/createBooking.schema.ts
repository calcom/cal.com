import { z } from "zod";

export const ZUnifiedCalendarTargetCalendarSchema = z.object({
  credentialId: z.number().int().positive(),
  providerCalendarId: z.string().trim().min(1),
});

export const ZUnifiedCalendarCreateBookingInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  attendeeEmails: z.array(z.string().email()).min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  targetCalendar: ZUnifiedCalendarTargetCalendarSchema,
  location: z.string().trim().min(1).max(1024).nullable().optional(),
  locationCredentialId: z.number().int().positive().nullable().optional(),
  note: z.string().trim().max(4000).nullable().optional(),
});

export const ZUnifiedCalendarCreateBookingOutputSchema = z.object({
  bookingId: z.number().int().positive(),
  bookingUid: z.string().min(1),
});

export type TUnifiedCalendarCreateBookingInput = z.infer<typeof ZUnifiedCalendarCreateBookingInputSchema>;
export type TUnifiedCalendarCreateBookingOutput = z.infer<typeof ZUnifiedCalendarCreateBookingOutputSchema>;
