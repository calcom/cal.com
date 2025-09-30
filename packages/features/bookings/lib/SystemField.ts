import { z } from "zod";

export const SystemField = z.enum([
  "name",
  "email",
  "location",
  "title",
  "notes",
  "guests",
  "rescheduleReason",
  //"smsReminderNumber",
  "attendeePhoneNumber",
]);

export const SMS_REMINDER_NUMBER_FIELD = "attendeePhoneNumber";
export const TITLE_FIELD = "title";
