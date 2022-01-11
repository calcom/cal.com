import type { Attendee } from "@prisma/client";
import * as z from "zod";

import { CompleteBooking, BookingModel } from "./index";

export const _AttendeeModel = z.object({
  id: z.number().int(),
  email: z.string(),
  name: z.string(),
  timeZone: z.string(),
  bookingId: z.number().int().nullable(),
});

export interface CompleteAttendee extends Attendee {
  booking: CompleteBooking | null;
}

/**
 * AttendeeModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const AttendeeModel: z.ZodSchema<CompleteAttendee> = z.lazy(() =>
  _AttendeeModel.extend({
    booking: BookingModel.nullable(),
  })
);
