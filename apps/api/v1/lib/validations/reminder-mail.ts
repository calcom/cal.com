import { z } from "zod";

import { ReminderMailSchema } from "@calcom/prisma/zod/modelSchema/ReminderMailSchema";

export const schemaReminderMailBaseBodyParams = ReminderMailSchema.omit({ id: true }).partial();

export const schemaReminderMailPublic = ReminderMailSchema.omit({});

const schemaReminderMailRequiredParams = z.object({
  referenceId: z.number().int(),
  reminderType: z.enum(["PENDING_BOOKING_CONFIRMATION"]),
  elapsedMinutes: z.number().int(),
});

export const schemaReminderMailBodyParams = schemaReminderMailBaseBodyParams.merge(
  schemaReminderMailRequiredParams
);
