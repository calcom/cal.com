import { z } from "zod";

export const ZConnectedCalendarsInputSchema = z
  .object({
    onboarding: z.boolean().optional(),
    // Fetches the calendars for this event-type only if present
    // Otherwise, fetches the calendars for the authenticated user
    eventTypeId: z.number().nullable(),
  })
  .optional();

export type TConnectedCalendarsInputSchema = z.infer<typeof ZConnectedCalendarsInputSchema>;
