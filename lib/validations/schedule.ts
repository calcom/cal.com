import { withValidation } from "next-validations";
import { z } from "zod";

import { _ScheduleModel as Schedule } from "@calcom/prisma/zod";

const schemaScheduleBaseBodyParams = Schedule.omit({ id: true }).partial();

const schemaScheduleRequiredParams = z.object({
  userId: z.number(),
  name: z.string(),
});

export const schemaScheduleBodyParams = schemaScheduleBaseBodyParams.merge(schemaScheduleRequiredParams);

export const schemaSchedulePublic = Schedule.omit({});

export const withValidSchedule = withValidation({
  schema: schemaScheduleBodyParams,
  type: "Zod",
  mode: "body",
});
