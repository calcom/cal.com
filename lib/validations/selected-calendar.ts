import { z } from "zod";

import { _SelectedCalendarModel as SelectedCalendar } from "@calcom/prisma/zod";

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
    // FIXME: Provide valid UserModel schema here, but not sure how yet.
    create: z.any(),
  }),
});

export const schemaSelectedCalendarBodyParams = schemaSelectedCalendarBaseBodyParams.merge(
  schemaSelectedCalendarRequiredParams
);
