import { EventType, PeriodType, SchedulingType } from "@prisma/client";
import * as z from "zod";

import * as imports from "../zod-utils";
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

// Helper schema for JSON data
type Literal = boolean | null | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const _EventTypeModel = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  position: z.number().int(),
  locations: imports.eventTypeLocations.nullable(),
  length: z.number().int(),
  hidden: z.boolean(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  eventName: z.string().nullable(),
  timeZone: z.string().nullable(),
  periodType: z.nativeEnum(PeriodType),
  periodStartDate: z.date().nullable(),
  periodEndDate: z.date().nullable(),
  periodDays: z.number().int().nullable(),
  periodCountCalendarDays: z.boolean().nullable(),
  requiresConfirmation: z.boolean(),
  disableGuests: z.boolean(),
  minimumBookingNotice: z.number().int(),
  schedulingType: z.nativeEnum(SchedulingType).nullable(),
  price: z.number().int(),
  currency: z.string(),
  slotInterval: z.number().int().nullable(),
});

export interface CompleteEventType extends EventType {
  users: CompleteUser[];
  team: CompleteTeam | null;
  bookings: CompleteBooking[];
  availability: CompleteAvailability[];
  destinationCalendar: CompleteDestinationCalendar | null;
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
    team: TeamModel.nullable(),
    bookings: BookingModel.array(),
    availability: AvailabilityModel.array(),
    destinationCalendar: DestinationCalendarModel.nullable(),
    customInputs: EventTypeCustomInputModel.array(),
    Schedule: ScheduleModel.array(),
  })
);
