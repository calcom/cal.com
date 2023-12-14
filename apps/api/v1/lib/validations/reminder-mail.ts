import { z } from "zod";

import { _ReminderMailModel as ReminderMail } from "@calcom/prisma/zod";

export const schemaReminderMailBaseBodyParams = ReminderMail.omit({ id: true }).partial();

export const schemaReminderMailPublic = ReminderMail.omit({});

const schemaReminderMailRequiredParams = z.object({
  referenceId: z.number().int(),
  reminderType: z.enum(["PENDING_BOOKING_CONFIRMATION"]),
  elapsedMinutes: z.number().int(),
});

export const schemaReminderMailBodyParams = schemaReminderMailBaseBodyParams.merge(
  schemaReminderMailRequiredParams
);
