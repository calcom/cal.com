import { z } from "zod";

import type { User } from "@calcom/prisma/client";

export type PersonAttendeeCommonFields = Pick<
  User,
  "id" | "email" | "name" | "locale" | "timeZone" | "username"
> & { phoneNumber?: string | null };

// Common data for all endpoints under webhook
export const commonBookingSchema = z.object({
  bookingId: z.number(),
});
