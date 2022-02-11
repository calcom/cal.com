import * as z from "zod";
import * as imports from "../zod-utils";
import { PeriodType, SchedulingType } from "@prisma/client";
import {
  CompleteUser,
  UserModel,
  CompleteTeam,
  TeamModel,
  CompleteBooking,
  BookingModel,
  CompleteAvailability,
  AvailabilityModel,
  CompleteDestinationCalendar,
  DestinationCalendarModel,
  CompleteEventTypeCustomInput,
  EventTypeCustomInputModel,
  CompleteSchedule,
  ScheduleModel,
} from "./index";

// Helper schema for JSON fields
type Literal = boolean | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const _EventTypeModel = z.object({
  id: z.number().int(),
  title: z.string().nonempty(),
  slug: imports.eventTypeSlug,
  description: z.string().nullish(),
  position: z.number().int(),
  locations: imports.eventTypeLocations,
  length: z.number().int(),
  hidden: z.boolean(),
  userId: z.number().int().nullish(),
  teamId: z.number().int().nullish(),
  eventName: z.string().nullish(),
  timeZone: z.string().nullish(),
  periodType: z.nativeEnum(PeriodType),
  periodStartDate: z.date().nullish(),
  periodEndDate: z.date().nullish(),
  periodDays: z.number().int().nullish(),
  periodCountCalendarDays: z.boolean().nullish(),
  requiresConfirmation: z.boolean(),
  disableGuests: z.boolean(),
  minimumBookingNotice: z.number().int(),
  schedulingType: z.nativeEnum(SchedulingType).nullish(),
  price: z.number().int(),
  currency: z.string(),
  slotInterval: z.number().int().nullish(),
  metadata: jsonSchema,
});

export interface CompleteEventType extends z.infer<typeof _EventTypeModel> {
  users: CompleteUser[];
  team?: CompleteTeam | null;
  bookings: CompleteBooking[];
  availability: CompleteAvailability[];
  destinationCalendar?: CompleteDestinationCalendar | null;
  customInputs: CompleteEventTypeCustomInput[];
  Schedule: CompleteSchedule[];
}

/**
 * EventTypeModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const EventTypeModel: z.ZodSchema<CompleteEventType> = z.lazy(() =>
  _EventTypeModel.extend({
    users: UserModel.array(),
    team: TeamModel.nullish(),
    bookings: BookingModel.array(),
    availability: AvailabilityModel.array(),
    destinationCalendar: DestinationCalendarModel.nullish(),
    customInputs: EventTypeCustomInputModel.array(),
    Schedule: ScheduleModel.array(),
  })
);
