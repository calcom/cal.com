import { z } from "zod";

import { _AvailabilityModel as Availability, _ScheduleModel as Schedule } from "@calcom/prisma/zod";
import { denullishShape } from "@calcom/prisma/zod-utils";

export const schemaAvailabilityBaseBodyParams = /** We make all these properties required */ denullishShape(
  Availability.pick({
    /** We need to pass the schedule where this availability belongs to */
    scheduleId: true,
  })
);

export const schemaAvailabilityReadPublic = Availability.pick({
  id: true,
  startTime: true,
  endTime: true,
  date: true,
  scheduleId: true,
  days: true,
  // eventTypeId: true /** @deprecated */,
  // userId: true /** @deprecated */,
}).merge(z.object({ success: z.boolean().optional(), Schedule: Schedule.partial() }).partial());

const schemaAvailabilityCreateParams = z
  .object({
    startTime: z.date().or(z.string()),
    endTime: z.date().or(z.string()),
    days: z.array(z.number()).optional(),
  })
  .strict();

const schemaAvailabilityEditParams = z
  .object({
    startTime: z.date().or(z.string()).optional(),
    endTime: z.date().or(z.string()).optional(),
    days: z.array(z.number()).optional(),
  })
  .strict();

export const schemaAvailabilityEditBodyParams = schemaAvailabilityEditParams;

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
