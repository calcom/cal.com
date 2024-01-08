import { z } from "zod";

import dayjs from "@calcom/dayjs";

const scheduleSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  name: z.string(),
  timeZone: z.string().nullish(),
});

const availabilitySchema = z.object({
  id: z.number().int(),
  days: z.number().int().array(),
  startTime: z.date(),
  endTime: z.date(),
});

export const schemaScheduleResponse = z
  .object({})
  .merge(scheduleSchema)
  .merge(
    z.object({
      availability: z
        .array(availabilitySchema)
        .transform((availabilities) =>
          availabilities.map((availability) => ({
            ...availability,
            startTime: dayjs.utc(availability.startTime).format("HH:mm:ss"),
            endTime: dayjs.utc(availability.endTime).format("HH:mm:ss"),
          }))
        )
        .optional(),
    })
  );
