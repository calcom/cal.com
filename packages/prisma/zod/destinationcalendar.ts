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
  userId: z.number().int().nullish(),
  bookingId: z.number().int().nullish(),
  eventTypeId: z.number().int().nullish(),
});

export interface CompleteDestinationCalendar extends z.infer<typeof _DestinationCalendarModel> {
  user?: CompleteUser | null;
  booking?: CompleteBooking | null;
  eventType?: CompleteEventType | null;
}

/**
 * DestinationCalendarModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const DestinationCalendarModel: z.ZodSchema<CompleteDestinationCalendar> = z.lazy(() =>
  _DestinationCalendarModel.extend({
    user: UserModel.nullish(),
    booking: BookingModel.nullish(),
    eventType: EventTypeModel.nullish(),
  })
);
