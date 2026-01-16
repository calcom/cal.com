import { z } from "zod";

export type TConnectedCalendarsInputSchema =
  | {
      autoSelectCalendarForConflictCheck?: boolean;
      // Fetches the calendars for this event-type only if present
      // Otherwise, fetches the calendars for the authenticated user
      eventTypeId?: number | null;
    }
  | undefined;

export const ZConnectedCalendarsInputSchema: z.ZodType<TConnectedCalendarsInputSchema> = z
  .object({
    autoSelectCalendarForConflictCheck: z.boolean().optional(),
    // Fetches the calendars for this event-type only if present
    // Otherwise, fetches the calendars for the authenticated user
    eventTypeId: z.number().nullish(),
  })
  .optional();
