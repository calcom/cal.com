import {
  ATTENDEE_PHONE_NUMBER_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  SMS_REMINDER_NUMBER_FIELD,
} from "@calcom/lib/bookings/SystemField";

/** The field that serves as the merge target for all phone sources when unified mode is on. */
export const UNIFIED_PHONE_TARGET = ATTENDEE_PHONE_NUMBER_FIELD;

/** Phone fields that get merged INTO the unified target. */
export const NON_TARGET_PHONE_FIELD_NAMES = [
  SMS_REMINDER_NUMBER_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
] as const;
