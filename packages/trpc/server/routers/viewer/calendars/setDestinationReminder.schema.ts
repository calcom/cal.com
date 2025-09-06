import { z } from "zod";

const ZUpdateDestinationCalendarReminderInputSchema = z.object({
  credentialId: z.number(),
  integration: z.string(),
  defaultReminder: z.number(),
});

export type TSetDestinationCalendarReminderSchema = z.infer<
  typeof ZUpdateDestinationCalendarReminderInputSchema
>;
