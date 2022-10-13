import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { _ScheduleModel as Schedule, _AvailabilityModel as Availability } from "@calcom/prisma/zod";

import { timeZone } from "./shared/timeZone";

const schemaScheduleBaseBodyParams = Schedule.omit({ id: true, timeZone: true }).partial();

export const schemaSingleScheduleBodyParams = schemaScheduleBaseBodyParams.merge(
  z.object({ userId: z.number().optional(), timeZone: timeZone.optional() })
);

export const schemaCreateScheduleBodyParams = schemaScheduleBaseBodyParams.merge(
  z.object({ userId: z.number().optional(), name: z.string(), timeZone })
);

export const schemaSchedulePublic = z
  .object({ id: z.number() })
  .merge(Schedule)
  .merge(
    z.object({
      availability: z
        .array(Availability.pick({ id: true, eventTypeId: true, days: true, startTime: true, endTime: true }))
        .transform((v) =>
          v.map((item) => ({
            ...item,
            startTime: dayjs.utc(item.startTime).format("HH:mm:ss"),
            endTime: dayjs.utc(item.endTime).format("HH:mm:ss"),
          }))
        )
        .optional(),
    })
  );
