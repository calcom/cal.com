import z from "zod";

// Common data for all endpoints under webhook
export const commonBookingSchema = z.object({
  bookingId: z.number(),
});
