import * as z from "zod";

import { ReminderType } from "../../node_modules/@prisma/client";
import * as imports from "../zod-utils";

export const _ReminderMailModel = z.object({
  id: z.number().int(),
  referenceId: z.number().int(),
  reminderType: z.nativeEnum(ReminderType),
  elapsedMinutes: z.number().int(),
  createdAt: z.date(),
});
