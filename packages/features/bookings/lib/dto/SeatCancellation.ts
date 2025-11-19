import { z } from "zod";

/**
 * DTO for seat cancellation input
 * Validates and transforms seat cancellation requests
 */
export const SeatCancellationInputSchema = z.object({
  seatReferenceUids: z.array(z.string().min(1)).min(1, "At least one seat must be selected"),
  userId: z.number().optional(),
  bookingUid: z.string().min(1),
});

export type SeatCancellationInput = z.infer<typeof SeatCancellationInputSchema>;

/**
 * DTO for seat cancellation options
 */
export const SeatCancellationOptionsSchema = z.object({
  isCancelledByHost: z.boolean().optional().default(false),
});

export type SeatCancellationOptions = z.infer<typeof SeatCancellationOptionsSchema>;

/**
 * DTO for seat reference data
 */
export const SeatReferenceSchema = z.object({
  referenceUid: z.string(),
  attendeeId: z.number(),
});

export type SeatReference = z.infer<typeof SeatReferenceSchema>;

/**
 * DTO for seat cancellation result
 */
export const SeatCancellationResultSchema = z.object({
  success: z.boolean(),
  removedSeatCount: z.number(),
  removedAttendeeCount: z.number(),
});

export type SeatCancellationResult = z.infer<typeof SeatCancellationResultSchema>;
