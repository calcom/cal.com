import { z } from "zod";

import { _EventTypeModel as EventType } from "@calcom/prisma/zod";

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

const schemaEventTypeBaseParams = z
  .object({
    title: z.string(),
    slug: z.string(),
    description: z.string().optional().nullable(),
    length: z.number().int(),
    locations: jsonSchema.optional().nullable().or(z.null()),
    metadata: z.null().or(jsonSchema),
    recurringEvent: jsonSchema.optional().nullable().or(z.null()),
  })
  .strict();

export const schemaEventTypeCreateBodyParams = schemaEventTypeBaseBodyParams.merge(schemaEventTypeBaseParams);

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
  locations: true,
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
})
  .merge(schemaEventTypeBaseParams)
  .partial();
