import { z } from "zod";

export const bookingNotificationTaskSchema = z.object({
  bookingId: z.number(),
  conferenceCredentialId: z.number().optional(),
  platformClientId: z.string().optional(),
  platformRescheduleUrl: z.string().optional(),
  platformCancelUrl: z.string().optional(),
  platformBookingUrl: z.string().optional(),
});
