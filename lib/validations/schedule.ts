import { z } from "zod";

import { _ScheduleModel as Schedule } from "@calcom/prisma/zod";

const schemaScheduleBaseBodyParams = Schedule.omit({ id: true }).partial();

const schemaScheduleRequiredParams = z.object({
  name: z.string(),
});

export const schemaScheduleBodyParams = schemaScheduleBaseBodyParams.merge(schemaScheduleRequiredParams);

export const schemaSchedulePublic = z
  .object({ id: z.number() })
  .merge(Schedule)
  .merge(
    z.object({
      availability: z.array(z.object({ id: z.number() })).optional(),
    })
  );
