import { z } from "zod";

export const ZUpdateDestinationCalendarReminderInputSchema = z.object({
  credentialId: z.number(),
  integration: z.literal("google_calendar"),
  defaultReminder: z.union([z.literal(10), z.literal(30), z.literal(60)]),
});

export type TSetDestinationCalendarReminderSchema = z.infer<
  typeof ZUpdateDestinationCalendarReminderInputSchema
>;
