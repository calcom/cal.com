import { z } from "zod";

export const VALID_REMINDER_MINUTES = [10, 30, 60] as const;

export const ZSetDestinationReminderInputSchema = z.object({
  credentialId: z.number(),
  integration: z.string(),
  defaultReminder: z.number().refine((val) => VALID_REMINDER_MINUTES.includes(val as 10 | 30 | 60), {
    message: "Invalid reminder duration",
  }),
});

export type TSetDestinationReminderInputSchema = z.infer<typeof ZSetDestinationReminderInputSchema>;
