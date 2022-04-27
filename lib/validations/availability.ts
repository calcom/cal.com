import { z } from "zod";

import { _AvailabilityModel as Availability } from "@calcom/prisma/zod";

export const schemaAvailabilityBaseBodyParams = Availability.pick({
  startTime: true,
  endTime: true,
  date: true,
  scheduleId: true,
  days: true,
}).partial();

export const schemaAvailabilityReadPublic = Availability.pick({
  id: true,
  startTime: true,
  endTime: true,
  date: true,
  scheduleId: true,
  days: true,
  userId: true,
  eventTypeId: true,
});

const schemaAvailabilityCreateParams = z.object({
  startTime: z.date().or(z.string()),
  endTime: z.date().or(z.string()),
  days: z.array(z.number()).optional(),
  eventTypeId: z.number().optional(),
});

const schemaAvailabilityEditParams = z.object({
  startTime: z.date().or(z.string()).optional(),
  endTime: z.date().or(z.string()).optional(),
  days: z.array(z.number()).optional(),
  eventTypeId: z.number().optional(),
});
export const schemaAvailabilityEditBodyParams = schemaAvailabilityBaseBodyParams.merge(
  schemaAvailabilityEditParams
);
export const schemaAvailabilityCreateBodyParams = schemaAvailabilityBaseBodyParams.merge(
  schemaAvailabilityCreateParams
);
