import { z } from "zod";

import { _AvailabilityModel as Availability } from "@calcom/prisma/zod";

export const schemaAvailabilityBaseBodyParams = Availability.pick({
  startTime: true,
  endTime: true,
  date: true,
  scheduleId: true,
  days: true,
  userId: true,
}).partial();

export const schemaAvailabilityReadPublic = Availability.pick({
  id: true,
  startTime: true,
  endTime: true,
  date: true,
  scheduleId: true,
  days: true,
  eventTypeId: true,
  userId: true,
}).merge(z.object({ success: z.boolean().optional() }));

const schemaAvailabilityCreateParams = z
  .object({
    startTime: z.date().or(z.string()),
    endTime: z.date().or(z.string()),
    days: z.array(z.number()).optional(),
    eventTypeId: z.number().optional(),
  })
  .strict();

const schemaAvailabilityEditParams = z
  .object({
    startTime: z.date().or(z.string()).optional(),
    endTime: z.date().or(z.string()).optional(),
    days: z.array(z.number()).optional(),
    eventTypeId: z.number().optional(),
  })
  .strict();

export const schemaAvailabilityEditBodyParams = schemaAvailabilityBaseBodyParams.merge(
  schemaAvailabilityEditParams
);
export const schemaAvailabilityCreateBodyParams = schemaAvailabilityBaseBodyParams.merge(
  schemaAvailabilityCreateParams
);

export const schemaAvailabilityReadBodyParams = z
  .object({
    userId: z.union([z.number(), z.array(z.number())]),
  })
  .partial();

export const schemaSingleAvailabilityReadBodyParams = z.object({
  userId: z.number(),
});
