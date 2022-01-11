import { ReminderType } from "@prisma/client";
import * as z from "zod";

export const _ReminderMailModel = z.object({
  id: z.number().int(),
  referenceId: z.number().int(),
  reminderType: z.nativeEnum(ReminderType),
  elapsedMinutes: z.number().int(),
  createdAt: z.date(),
});
