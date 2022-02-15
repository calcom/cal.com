import * as z from "zod";
import * as imports from "../zod-utils";
import { BookingStatus } from "@prisma/client";
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
  userId: z.number().int().nullish(),
  eventTypeId: z.number().int().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date().nullish(),
  confirmed: z.boolean(),
  rejected: z.boolean(),
  status: z.nativeEnum(BookingStatus),
  paid: z.boolean(),
  cancellationReason: z.string().nullish(),
  rejectionReason: z.string().nullish(),
});

export interface CompleteBooking extends z.infer<typeof _BookingModel> {
  user?: CompleteUser | null;
  references: CompleteBookingReference[];
  eventType?: CompleteEventType | null;
  attendees: CompleteAttendee[];
  dailyRef?: CompleteDailyEventReference | null;
  payment: CompletePayment[];
  destinationCalendar?: CompleteDestinationCalendar | null;
}

/**
 * BookingModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const BookingModel: z.ZodSchema<CompleteBooking> = z.lazy(() =>
  _BookingModel.extend({
    user: UserModel.nullish(),
    references: BookingReferenceModel.array(),
    eventType: EventTypeModel.nullish(),
    attendees: AttendeeModel.array(),
    dailyRef: DailyEventReferenceModel.nullish(),
    payment: PaymentModel.array(),
    destinationCalendar: DestinationCalendarModel.nullish(),
  })
);
