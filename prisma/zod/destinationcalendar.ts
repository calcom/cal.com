import type { DestinationCalendar } from "@prisma/client";
import * as z from "zod";

import * as imports from "../zod-utils";
import {
  CompleteUser,
  UserModel,
  CompleteBooking,
  BookingModel,
  CompleteEventType,
  EventTypeModel,
} from "./index";

export const _DestinationCalendarModel = z.object({
  id: z.number().int(),
  integration: z.string(),
  externalId: z.string(),
  userId: z.number().int().nullable(),
  bookingId: z.number().int().nullable(),
  eventTypeId: z.number().int().nullable(),
});

export interface CompleteDestinationCalendar extends DestinationCalendar {
  user: CompleteUser | null;
  booking: CompleteBooking | null;
  eventType: CompleteEventType | null;
}

/**
 * DestinationCalendarModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const DestinationCalendarModel: z.ZodSchema<CompleteDestinationCalendar> = z.lazy(() =>
  _DestinationCalendarModel.extend({
    user: UserModel.nullable(),
    booking: BookingModel.nullable(),
    eventType: EventTypeModel.nullable(),
  })
);
