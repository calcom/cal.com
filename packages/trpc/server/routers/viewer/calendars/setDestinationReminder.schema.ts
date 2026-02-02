import { z } from "zod";

export const VALID_REMINDER_MINUTES = [0, 10, 30, 60] as const;

export const reminderSchema = z.union([z.literal(0), z.literal(10), z.literal(30), z.literal(60), z.null()]);

export const ZSetDestinationReminderInputSchema = z.object({
  credentialId: z.number(),
  integration: z.string(),
  defaultReminder: reminderSchema.nullable(),
});

export type TSetDestinationReminderInputSchema = z.infer<typeof ZSetDestinationReminderInputSchema>;
export type ReminderMinutes = z.infer<typeof reminderSchema>;
