import { z } from "zod";

import { _DestinationCalendarModel as DestinationCalendar } from "@calcom/prisma/zod";

export const schemaDestinationCalendarBaseBodyParams = DestinationCalendar.pick({
  integration: true,
  externalId: true,
  eventTypeId: true,
  bookingId: true,
  userId: true,
}).partial();

const schemaDestinationCalendarEditParams = z.object({
  integration: z.string(),
  externalId: z.string(),
  eventTypeId: z.number(),
  bookingId: z.number(),
  userId: z.number(),
});

export const schemaDestinationCalendarEditBodyParams = schemaDestinationCalendarBaseBodyParams.merge(
  schemaDestinationCalendarEditParams
);
const schemaDestinationCalendarCreateParams = z.object({
  integration: z.string(),
  externalId: z.string(),
  eventTypeId: z.number(),
  bookingId: z.number(),
  userId: z.number(),
});

export const schemaDestinationCalendarCreateBodyParams = schemaDestinationCalendarBaseBodyParams.merge(
  schemaDestinationCalendarCreateParams
);

export const schemaDestinationCalendarReadPublic = DestinationCalendar.pick({
  id: true,
  integration: true,
  externalId: true,
  eventTypeId: true,
  bookingId: true,
  userId: true,
});
