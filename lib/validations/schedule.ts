import { withValidation } from "next-validations";

import { _ScheduleModel as Schedule } from "@calcom/prisma/zod";

export const schemaScheduleBodyParams = Schedule.omit({ id: true }).partial();

export const schemaSchedulePublic = Schedule.omit({});

export const withValidSchedule = withValidation({
  schema: schemaScheduleBodyParams,
  type: "Zod",
  mode: "body",
});
