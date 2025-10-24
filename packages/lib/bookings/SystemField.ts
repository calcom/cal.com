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
  "attendeePhoneNumber",
  "aiAgentCallPhoneNumber",
]);

export const SMS_REMINDER_NUMBER_FIELD = "smsReminderNumber";
export const CAL_AI_AGENT_PHONE_NUMBER_FIELD = "aiAgentCallPhoneNumber";
export const TITLE_FIELD = "title";
