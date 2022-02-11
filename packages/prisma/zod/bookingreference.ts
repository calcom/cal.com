import * as z from "zod";
import * as imports from "../zod-utils";
import { CompleteBooking, BookingModel } from "./index";

export const _BookingReferenceModel = z.object({
  id: z.number().int(),
  type: z.string(),
  uid: z.string(),
  meetingId: z.string().nullish(),
  meetingPassword: z.string().nullish(),
  meetingUrl: z.string().nullish(),
  bookingId: z.number().int().nullish(),
});

export interface CompleteBookingReference extends z.infer<typeof _BookingReferenceModel> {
  booking?: CompleteBooking | null;
}

/**
 * BookingReferenceModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const BookingReferenceModel: z.ZodSchema<CompleteBookingReference> = z.lazy(() =>
  _BookingReferenceModel.extend({
    booking: BookingModel.nullish(),
  })
);
