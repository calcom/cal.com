import type { BookingReference } from "@prisma/client";
import * as z from "zod";

import * as imports from "../zod-utils";
import { CompleteBooking, BookingModel } from "./index";

export const _BookingReferenceModel = z.object({
  id: z.number().int(),
  type: z.string(),
  uid: z.string(),
  meetingId: z.string().nullable(),
  meetingPassword: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  bookingId: z.number().int().nullable(),
});

export interface CompleteBookingReference extends BookingReference {
  booking: CompleteBooking | null;
}

/**
 * BookingReferenceModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const BookingReferenceModel: z.ZodSchema<CompleteBookingReference> = z.lazy(() =>
  _BookingReferenceModel.extend({
    booking: BookingModel.nullable(),
  })
);
