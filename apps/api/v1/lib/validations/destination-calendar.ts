import { z } from "zod";

import { DestinationCalendarSchema } from "@calcom/prisma/zod/modelSchema/DestinationCalendarSchema";

// Type cast to preserve original behavior while satisfying Zod 3.25's stricter .pick() typing
// bookingId doesn't exist in DestinationCalendarSchema but was in the original mask
const destinationCalendarBasePickMask = {
  integration: true,
  externalId: true,
  eventTypeId: true,
  bookingId: true,
  userId: true,
} as const;

export const schemaDestinationCalendarBaseBodyParams = DestinationCalendarSchema.pick(
  destinationCalendarBasePickMask as unknown as Parameters<typeof DestinationCalendarSchema.pick>[0]
).partial();

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

// Type cast to preserve original behavior while satisfying Zod 3.25's stricter .pick() typing
const destinationCalendarReadPublicPickMask = {
  id: true,
  integration: true,
  externalId: true,
  eventTypeId: true,
  bookingId: true,
  userId: true,
} as const;

export const schemaDestinationCalendarReadPublic = DestinationCalendarSchema.pick(
  destinationCalendarReadPublicPickMask as unknown as Parameters<typeof DestinationCalendarSchema.pick>[0]
);
