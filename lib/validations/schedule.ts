import { z } from "zod";

import { _ScheduleModel as Schedule } from "@calcom/prisma/zod";

const schemaScheduleBaseBodyParams = Schedule.omit({ id: true }).partial();

const schemaScheduleRequiredParams = z.object({
  userId: z.number().optional(),
  name: z.string(),
});

export const schemaScheduleBodyParams = schemaScheduleBaseBodyParams.merge(schemaScheduleRequiredParams);

export const schemaSchedulePublic = Schedule.omit({});
