import { z } from "zod";

export const SystemField = z.enum([
  "name",
  "email",
  "location",
  "notes",
  "guests",
  "rescheduleReason",
  "smsReminderNumber",
]);
