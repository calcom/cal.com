import dayjs from "@calcom/dayjs";
import { AvailabilitySchema } from "@calcom/prisma/zod/modelSchema/AvailabilitySchema";
import { ScheduleSchema } from "@calcom/prisma/zod/modelSchema/ScheduleSchema";
import { z } from "zod";
import { timeZone } from "./shared/timeZone";

const schemaScheduleBaseBodyParams = ScheduleSchema.omit({ id: true, timeZone: true }).partial();

export const schemaSingleScheduleBodyParams = schemaScheduleBaseBodyParams.merge(
  z.object({ userId: z.number().optional(), timeZone: timeZone.optional() })
);

export const schemaCreateScheduleBodyParams = schemaScheduleBaseBodyParams.merge(
  z.object({ userId: z.number().optional(), name: z.string(), timeZone })
);

export const schemaSchedulePublic = z
  .object({ id: z.number() })
  .merge(ScheduleSchema)
  .merge(
    z.object({
      availability: z
        .array(
          AvailabilitySchema.pick({
            id: true,
            eventTypeId: true,
            date: true,
            days: true,
            startTime: true,
            endTime: true,
          })
        )
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
