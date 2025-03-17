import { z } from "zod";

import { _DestinationCalendarModel as DestinationCalendar } from "@calcom/prisma/zod";

export const schemaDestinationCalendarBaseBodyParams = DestinationCalendar.pick({
  integration: true,
  externalId: true,
  eventTypeId: true,
  bookingId: true,
  userId: true,
}).partial();

const schemaDestinationCalendarCreateParams = z
  .object({
    integration: z.string(),
    externalId: z.string(),
    eventTypeId: z.number().optional(),
    bookingId: z.number().optional(),
    userId: z.number().optional(),
  })
  .strict();

export const schemaDestinationCalendarCreateBodyParams = schemaDestinationCalendarBaseBodyParams.merge(
  schemaDestinationCalendarCreateParams
);

const schemaDestinationCalendarEditParams = z
  .object({
    integration: z.string().optional(),
    externalId: z.string().optional(),
    eventTypeId: z.number().optional(),
    bookingId: z.number().optional(),
    userId: z.number().optional(),
  })
  .strict();

export const schemaDestinationCalendarEditBodyParams = schemaDestinationCalendarBaseBodyParams.merge(
  schemaDestinationCalendarEditParams
);

export const schemaDestinationCalendarReadPublic = DestinationCalendar.pick({
  id: true,
  integration: true,
  externalId: true,
  eventTypeId: true,
  bookingId: true,
  userId: true,
});
