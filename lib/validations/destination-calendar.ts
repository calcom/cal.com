import { withValidation } from "next-validations";
import { z } from "zod";

import { _DestinationCalendarModel as DestinationCalendar } from "@calcom/prisma/zod";

export const schemaDestinationCalendarBaseBodyParams = DestinationCalendar.omit({ id: true }).partial();

const schemaDestinationCalendarRequiredParams = z.object({
  integration: z.string(),
  externalId: z.string(),
});

export const schemaDestinationCalendarBodyParams = schemaDestinationCalendarBaseBodyParams.merge(
  schemaDestinationCalendarRequiredParams
);

export const schemaDestinationCalendarPublic = DestinationCalendar.omit({});

export const withValidDestinationCalendar = withValidation({
  schema: schemaDestinationCalendarBodyParams,
  type: "Zod",
  mode: "body",
});
