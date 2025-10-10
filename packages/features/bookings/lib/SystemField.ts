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
  "unifiedPhoneNumber",
]);

export const SMS_REMINDER_NUMBER_FIELD = "smsReminderNumber";
export const CAL_AI_AGENT_PHONE_NUMBER_FIELD = "aiAgentCallPhoneNumber";
export const UNIFIED_PHONE_NUMBER_FIELD = "unifiedPhoneNumber";
export const TITLE_FIELD = "title";
