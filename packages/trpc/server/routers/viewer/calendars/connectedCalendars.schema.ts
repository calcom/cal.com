import { z } from "zod";

export type TConnectedCalendarsInputSchema =
  | {
      onboarding?: boolean;
      // Fetches the calendars for this event-type only if present
      // Otherwise, fetches the calendars for the authenticated user
      eventTypeId?: number | null;
      skipSync?: boolean;
    }
  | undefined;

export const ZConnectedCalendarsInputSchema: z.ZodType<TConnectedCalendarsInputSchema> = z
  .object({
    onboarding: z.boolean().optional(),
    // Fetches the calendars for this event-type only if present
    // Otherwise, fetches the calendars for the authenticated user
    eventTypeId: z.number().nullish(),
    skipSync: z.boolean().optional(),
  })
  .optional();
