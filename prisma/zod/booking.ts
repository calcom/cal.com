import { Booking, BookingStatus } from "@prisma/client";
import * as z from "zod";

import {
  CompleteUser,
  UserModel,
  CompleteBookingReference,
  BookingReferenceModel,
  CompleteEventType,
  EventTypeModel,
  CompleteAttendee,
  AttendeeModel,
  CompleteDailyEventReference,
  DailyEventReferenceModel,
  CompletePayment,
  PaymentModel,
  CompleteDestinationCalendar,
  DestinationCalendarModel,
} from "./index";

export const _BookingModel = z.object({
  id: z.number().int(),
  uid: z.string(),
  userId: z.number().int().nullable(),
  eventTypeId: z.number().int().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  confirmed: z.boolean(),
  rejected: z.boolean(),
  status: z.nativeEnum(BookingStatus),
  paid: z.boolean(),
});

export interface CompleteBooking extends Booking {
  user: CompleteUser | null;
  references: CompleteBookingReference[];
  eventType: CompleteEventType | null;
  attendees: CompleteAttendee[];
  dailyRef: CompleteDailyEventReference | null;
  payment: CompletePayment[];
  destinationCalendar: CompleteDestinationCalendar | null;
}

/**
 * BookingModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const BookingModel: z.ZodSchema<CompleteBooking> = z.lazy(() =>
  _BookingModel.extend({
    user: UserModel.nullable(),
    references: BookingReferenceModel.array(),
    eventType: EventTypeModel.nullable(),
    attendees: AttendeeModel.array(),
    dailyRef: DailyEventReferenceModel.nullable(),
    payment: PaymentModel.array(),
    destinationCalendar: DestinationCalendarModel.nullable(),
  })
);
