import { z } from "zod";

export const ZSetDestinationReminderInputSchema = z.object({
  credentialId: z.number(),
  integration: z.string(),
  defaultReminder: z.number().min(0).max(60).default(10),
});

export type TSetDestinationReminderInputSchema = z.infer<typeof ZSetDestinationReminderInputSchema>;
