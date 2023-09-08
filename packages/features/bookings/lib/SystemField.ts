import { z } from "zod";

export const SystemField = z.enum([
  "name",
  "email",
  "location",
  "title",
  "notes",
  "guests",
  "rescheduleReason",
  "smsReminderNumber",
]);

export const SMS_REMINDER_NUMBER_FIELD = "smsReminderNumber";
