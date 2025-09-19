import { z } from "zod";

import {
  MAX_SEATS_PER_TIME_SLOT,
  MAX_EVENT_DURATION_MINUTES,
  MIN_EVENT_DURATION_MINUTES,
} from "@calcom/lib/constants";
import slugify from "@calcom/lib/slugify";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import { EventTypeSchema } from "@calcom/prisma/zod/modelSchema/EventTypeSchema";
import { HostSchema } from "@calcom/prisma/zod/modelSchema/HostSchema";

import { Frequency } from "~/lib/types";

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

const hostSchema = HostSchema.pick({
  isFixed: true,
  userId: true,
  scheduleId: true,
});

export const childrenSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
});

export const schemaEventTypeBaseBodyParams = EventTypeSchema.pick({
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
  assignAllTeamMembers: true,
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
    length: z.number().int().min(MIN_EVENT_DURATION_MINUTES).max(MAX_EVENT_DURATION_MINUTES),
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
    seatsPerTimeSlot: z.number().min(1).max(MAX_SEATS_PER_TIME_SLOT).nullable().optional(),
    seatsShowAttendees: z.boolean().optional(),
    seatsShowAvailabilityCount: z.boolean().optional(),
    bookingFields: eventTypeBookingFields.optional(),
    scheduleId: z.number().optional(),
  })
  .strict();

export const schemaEventTypeEditBodyParams = schemaEventTypeBaseBodyParams.merge(schemaEventTypeEditParams);
