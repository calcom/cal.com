import { withValidation } from "next-validations";

import { _SelectedCalendarModel as SelectedCalendar } from "@calcom/prisma/zod";

export const schemaSelectedCalendarBodyParams = SelectedCalendar.omit({}).partial();

export const schemaSelectedCalendarPublic = SelectedCalendar.omit({ userId: true });

export const withValidSelectedCalendar = withValidation({
  schema: schemaSelectedCalendarBodyParams,
  type: "Zod",
  mode: "body",
});
