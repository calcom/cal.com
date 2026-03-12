import { z } from "zod";

export const ZUnifiedCalendarCancelBookingInputSchema = z.object({
  bookingId: z.number().int().positive(),
  cancellationReason: z.string().trim().max(2000).nullable().optional(),
});

export const ZUnifiedCalendarCancelBookingOutputSchema = z.object({
  bookingId: z.number().int().positive(),
  bookingUid: z.string().min(1),
  status: z.literal("CANCELLED"),
});

export type TUnifiedCalendarCancelBookingInput = z.infer<typeof ZUnifiedCalendarCancelBookingInputSchema>;
export type TUnifiedCalendarCancelBookingOutput = z.infer<typeof ZUnifiedCalendarCancelBookingOutputSchema>;
