import { z } from "zod";

const CalendarSchema = z.object({
  externalId: z.string(),
  name: z.string(),
  primary: z.boolean(),
  readOnly: z.boolean(),
});

const IntegrationSchema = z.object({
  name: z.string(),
  appId: z.string(),
  userId: z.number(),
  integration: z.string(),
  calendars: z.array(CalendarSchema),
});

export const schemaConnectedCalendarsReadPublic = z.array(IntegrationSchema);
