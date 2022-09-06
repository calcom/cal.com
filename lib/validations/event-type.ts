import { z } from "zod";

import { _EventTypeModel as EventType } from "@calcom/prisma/zod";

import { Frequency } from "@lib/types";
import { timeZone } from "@lib/validations/shared/timeZone";

import { jsonSchema } from "./shared/jsonSchema";

export const schemaEventTypeBaseBodyParams = EventType.pick({
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
}).partial();

const schemaEventTypeCreateParams = z
  .object({
    title: z.string(),
    slug: z.string(),
    description: z.string().optional().nullable(),
    length: z.number().int(),
    locations: jsonSchema.optional(),
    metadata: z.any().optional(),
    recurringEvent: jsonSchema.optional(),
  })
  .strict();

export const schemaEventTypeCreateBodyParams =
  schemaEventTypeBaseBodyParams.merge(schemaEventTypeCreateParams);

const schemaEventTypeEditParams = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    length: z.number().int().optional(),
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
}).merge(
  z.object({
    recurringEvent: z
      .object({
        dtstart: z.date().optional(),
        interval: z.number().int().optional(),
        count: z.number().int().optional(),
        freq: z.nativeEnum(Frequency).optional(),
        until: z.date().optional(),
        tzid: timeZone.optional(),
      })
      .optional()
      .nullable(),
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
  })
);
