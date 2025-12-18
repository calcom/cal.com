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

export enum WhenToWrite {
  EVERY_BOOKING = "every_booking",
  FIELD_EMPTY = "field_empty",
}
