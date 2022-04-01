import { withValidation } from "next-validations";
import { z } from "zod";

import { _UserModel, _SelectedCalendarModel as SelectedCalendar } from "@calcom/prisma/zod";

export const schemaSelectedCalendarBaseBodyParams = SelectedCalendar.omit({ userId: true }).partial();

export const schemaSelectedCalendarPublic = SelectedCalendar.omit({});

const schemaSelectedCalendarRequiredParams = z.object({
  externalId: z.string(),
  integration: z.string(),
  user: z.object({
    connect: z.object({
      id: z.number().optional(),
      username: z.string().optional(),
      email: z.string().optional(),
    }),
    create: z.any(),
  }),
});

export const schemaSelectedCalendarBodyParams = schemaSelectedCalendarBaseBodyParams.merge(
  schemaSelectedCalendarRequiredParams
);

export const withValidSelectedCalendar = withValidation({
  schema: schemaSelectedCalendarBodyParams,
  type: "Zod",
  mode: "body",
});
