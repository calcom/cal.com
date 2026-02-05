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
export const ATTENDEE_PHONE_NUMBER_FIELD = "attendeePhoneNumber";

export const SYSTEM_PHONE_FIELDS = new Set([
  ATTENDEE_PHONE_NUMBER_FIELD,
  SMS_REMINDER_NUMBER_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
]);

/**
 * Check if a field should be displayed in custom responses section.
 * System fields are filtered out except for SMS_REMINDER_NUMBER_FIELD and TITLE_FIELD
 * which don't have dedicated sections in the UI.
 */
export function shouldShowFieldInCustomResponses(fieldName: string): boolean {
  const isSystemField = SystemField.safeParse(fieldName);

  // Filter out system fields except SMS_REMINDER_NUMBER_FIELD and TITLE_FIELD
  // These don't have dedicated sections in the UI
  if (isSystemField.success && fieldName !== SMS_REMINDER_NUMBER_FIELD && fieldName !== TITLE_FIELD) {
    return false;
  }

  return true;
}
