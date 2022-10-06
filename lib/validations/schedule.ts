import { z } from "zod";

import { _ScheduleModel as Schedule, _AvailabilityModel as Availability } from "@calcom/prisma/zod";

const schemaScheduleBaseBodyParams = Schedule.omit({ id: true }).partial();

const schemaScheduleRequiredParams = z.object({
  name: z.string().optional(),
  userId: z.union([z.number(), z.array(z.number())]).optional(),
});

export const schemaScheduleBodyParams = schemaScheduleBaseBodyParams.merge(schemaScheduleRequiredParams);

export const schemaSingleScheduleBodyParams = schemaScheduleBaseBodyParams.merge(
  z.object({ userId: z.number().optional() })
);

export const schemaCreateScheduleBodyParams = schemaScheduleBaseBodyParams.merge(
  z.object({ userId: z.number().optional(), name: z.string() })
);

export const schemaSchedulePublic = z
  .object({ id: z.number() })
  .merge(Schedule)
  .merge(
    z.object({
      availability: z
        .array(Availability.pick({ id: true, eventTypeId: true, days: true, startTime: true, endTime: true }))
        .optional(),
    })
  );
