import { z } from "zod";

import slugify from "@calcom/lib/slugify";
import { _EventTypeModel as EventType, _HostModel } from "@calcom/prisma/zod";
import { customInputSchema, eventTypeBookingFields } from "@calcom/prisma/zod-utils";

import { Frequency } from "~/lib/types";

import { jsonSchema } from "./shared/jsonSchema";
import { schemaQueryUserId } from "./shared/queryUserId";
import { timeZone } from "./shared/timeZone";

const recurringEventInputSchema = z.object({
  dtstart: z.string().optional(),
  interval: z.number().int().optional(),
  count: z.number().int().optional(),
  freq: z.nativeEnum(Frequency).optional(),
  until: z.string().optional(),
  tzid: timeZone.optional(),
});

const hostSchema = _HostModel.pick({
  isFixed: true,
  userId: true,
});

export const childrenSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
});

export const schemaEventTypeBaseBodyParams = EventType.pick({
  title: true,
  description: true,
  slug: true,
  length: true,
  hidden: true,
  position: true,
  eventName: true,
  timeZone: true,
  schedulingType: true,
  // START Limit future bookings
  periodType: true,
  periodStartDate: true,
  periodEndDate: true,
  periodDays: true,
  periodCountCalendarDays: true,
  // END Limit future bookings
  requiresConfirmation: true,
  disableGuests: true,
  hideCalendarNotes: true,
  minimumBookingNotice: true,
  parentId: true,
  beforeEventBuffer: true,
  afterEventBuffer: true,
  teamId: true,
  price: true,
  currency: true,
  slotInterval: true,
  successRedirectUrl: true,
  locations: true,
  bookingLimits: true,
  onlyShowFirstAvailableSlot: true,
  durationLimits: true,
})
  .merge(
    z.object({
      children: z.array(childrenSchema).optional().default([]),
      hosts: z.array(hostSchema).optional().default([]),
    })
  )
  .partial()
  .strict();

const schemaEventTypeCreateParams = z
  .object({
    title: z.string(),
    slug: z.string().transform((s) => slugify(s)),
    description: z.string().optional().nullable(),
    length: z.number().int(),
    metadata: z.any().optional(),
    recurringEvent: recurringEventInputSchema.optional(),
    seatsPerTimeSlot: z.number().optional(),
    seatsShowAttendees: z.boolean().optional(),
    seatsShowAvailabilityCount: z.boolean().optional(),
    bookingFields: eventTypeBookingFields.optional(),
    scheduleId: z.number().optional(),
    parentId: z.number().optional(),
  })
  .strict();

export const schemaEventTypeCreateBodyParams = schemaEventTypeBaseBodyParams
  .merge(schemaEventTypeCreateParams)
  .merge(schemaQueryUserId.partial());

const schemaEventTypeEditParams = z
  .object({
    title: z.string().optional(),
    slug: z
      .string()
      .transform((s) => slugify(s))
      .optional(),
    length: z.number().int().optional(),
    seatsPerTimeSlot: z.number().optional(),
    seatsShowAttendees: z.boolean().optional(),
    seatsShowAvailabilityCount: z.boolean().optional(),
    bookingFields: eventTypeBookingFields.optional(),
    scheduleId: z.number().optional(),
  })
  .strict();

export const schemaEventTypeEditBodyParams = schemaEventTypeBaseBodyParams.merge(schemaEventTypeEditParams);
export const schemaEventTypeReadPublic = EventType.pick({
  id: true,
  title: true,
  slug: true,
  length: true,
  hidden: true,
  position: true,
  userId: true,
  teamId: true,
  scheduleId: true,
  eventName: true,
  timeZone: true,
  periodType: true,
  periodStartDate: true,
  periodEndDate: true,
  periodDays: true,
  periodCountCalendarDays: true,
  requiresConfirmation: true,
  recurringEvent: true,
  disableGuests: true,
  hideCalendarNotes: true,
  minimumBookingNotice: true,
  beforeEventBuffer: true,
  afterEventBuffer: true,
  schedulingType: true,
  price: true,
  currency: true,
  slotInterval: true,
  parentId: true,
  successRedirectUrl: true,
  description: true,
  locations: true,
  metadata: true,
  seatsPerTimeSlot: true,
  seatsShowAttendees: true,
  seatsShowAvailabilityCount: true,
  bookingFields: true,
  bookingLimits: true,
  onlyShowFirstAvailableSlot: true,
  durationLimits: true,
}).merge(
  z.object({
    children: z.array(childrenSchema).optional().default([]),
    hosts: z.array(hostSchema).optional().default([]),
    locations: z
      .array(
        z.object({
          link: z.string().optional(),
          address: z.string().optional(),
          hostPhoneNumber: z.string().optional(),
          type: z.any().optional(),
        })
      )
      .nullable(),
    metadata: jsonSchema.nullable(),
    customInputs: customInputSchema.array().optional(),
    link: z.string().optional(),
    bookingFields: eventTypeBookingFields.optional().nullable(),
  })
);
