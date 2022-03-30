import { withValidation } from "next-validations";

import { _DestinationCalendarModel as DestinationCalendar } from "@calcom/prisma/zod";

export const schemaDestinationCalendarBodyParams = DestinationCalendar.omit({ id: true });

export const schemaDestinationCalendarPublic = DestinationCalendar.omit({});

export const withValidDestinationCalendar = withValidation({
  schema: schemaDestinationCalendarBodyParams,
  type: "Zod",
  mode: "body",
});
