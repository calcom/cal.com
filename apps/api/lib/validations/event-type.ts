import { z } from "zod";

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

export const schemaEventTypeBaseBodyParams = EventType.pick({
  title: true,
  description: true,
  slug: true,
  length: true,
  hidden: true,
  position: true,
  eventName: true,
  timeZone: true,
  periodType: true,
  periodStartDate: true,
  schedulingType: true,
  periodEndDate: true,
  periodDays: true,
  periodCountCalendarDays: true,
  requiresConfirmation: true,
  disableGuests: true,
  hideCalendarNotes: true,
  minimumBookingNotice: true,
  beforeEventBuffer: true,
  afterEventBuffer: true,
  teamId: true,
  price: true,
  currency: true,
  slotInterval: true,
  successRedirectUrl: true,
  locations: true,
})
  .merge(z.object({ hosts: z.array(hostSchema).optional().default([]) }))
  .partial()
  .strict();

const schemaEventTypeCreateParams = z
  .object({
    title: z.string(),
    slug: z.string(),
    description: z.string().optional().nullable(),
    length: z.number().int(),
    metadata: z.any().optional(),
    recurringEvent: recurringEventInputSchema.optional(),
    seatsPerTimeSlot: z.number().optional(),
    seatsShowAttendees: z.boolean().optional(),
    bookingFields: eventTypeBookingFields.optional(),
  })
  .strict();

export const schemaEventTypeCreateBodyParams = schemaEventTypeBaseBodyParams
  .merge(schemaEventTypeCreateParams)
  .merge(schemaQueryUserId.partial());

const schemaEventTypeEditParams = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    length: z.number().int().optional(),
    seatsPerTimeSlot: z.number().optional(),
    seatsShowAttendees: z.boolean().optional(),
    bookingFields: eventTypeBookingFields.optional(),
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
  successRedirectUrl: true,
  description: true,
  locations: true,
  metadata: true,
  seatsPerTimeSlot: true,
  seatsShowAttendees: true,
  bookingFields: true,
}).merge(
  z.object({
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
