/**
 * CRM field types supported across different CRM integrations.
 *
 * Implementation notes:
 * - TEXT, STRING, PHONE, TEXTAREA, CUSTOM: All handled identically as text fields
 * - DATE, DATETIME: Both handled identically, return ISO 8601 datetime strings
 * - CHECKBOX: Returns boolean values (true/false)
 * - PICKLIST: Dropdown/select fields
 */
export enum CrmFieldType {
  TEXT = "text",
  STRING = "string",
  DATE = "date",
  DATETIME = "datetime",
  PHONE = "phone",
  CHECKBOX = "checkbox",
  PICKLIST = "picklist",
  CUSTOM = "custom",
  TEXTAREA = "textarea",
}

export enum DateFieldType {
  BOOKING_START_DATE = "booking_start_date",
  BOOKING_CREATED_DATE = "booking_created_date",
  BOOKING_CANCEL_DATE = "booking_cancel_date",
}

/**
 * Controls when CRM field values should be written.
 *
 * - EVERY_BOOKING: Always write the value on every booking
 * - FIELD_EMPTY: Only write if the field is currently empty (prevents overwrites)
 */
export enum WhenToWrite {
  EVERY_BOOKING = "every_booking",
  FIELD_EMPTY = "field_empty",
}
