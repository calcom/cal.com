import type { User } from "@prisma/client";
import { z } from "zod";

export type PersonAttendeeCommonFields = Pick<
  User,
  "id" | "email" | "name" | "locale" | "timeZone" | "username"
>;

// Common data for all endpoints under webhook
export const commonBookingSchema = z.object({
  bookingId: z.number(),
});
