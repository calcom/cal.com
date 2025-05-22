import { z } from "zod";

import { denullishShape } from "@calcom/prisma/zod-utils";
import { AvailabilitySchema } from "@calcom/prisma/zod/modelSchema/AvailabilitySchema";
import { ScheduleSchema } from "@calcom/prisma/zod/modelSchema/ScheduleSchema";

export const schemaAvailabilityBaseBodyParams = /** We make all these properties required */ denullishShape(
  AvailabilitySchema.pick({
    /** We need to pass the schedule where this availability belongs to */
    scheduleId: true,
  })
);

export const schemaAvailabilityReadPublic = AvailabilitySchema.pick({
  id: true,
  startTime: true,
  endTime: true,
  date: true,
  scheduleId: true,
  days: true,
  // eventTypeId: true /** @deprecated */,
  // userId: true /** @deprecated */,
}).merge(z.object({ success: z.boolean().optional(), Schedule: ScheduleSchema.partial() }).partial());

const schemaAvailabilityCreateParams = z
  .object({
    startTime: z.date().or(z.string()),
    endTime: z.date().or(z.string()),
    days: z.array(z.number()).optional(),
    date: z.date().or(z.string()).optional(),
  })
  .strict();

const schemaAvailabilityEditParams = z
  .object({
    startTime: z.date().or(z.string()).optional(),
    endTime: z.date().or(z.string()).optional(),
    days: z.array(z.number()).optional(),
    date: z.date().or(z.string()).optional(),
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
