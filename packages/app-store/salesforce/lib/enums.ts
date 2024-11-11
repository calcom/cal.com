export enum SalesforceRecordEnum {
  CONTACT = "Contact",
  LEAD = "Lead",
  ACCOUNT = "Account",
}

export enum WhenToWriteToRecord {
  EVERY_BOOKING = "every_booking",
  FIELD_EMPTY = "field_empty",
}

export enum SalesforceFieldType {
  DATE = "date",
  TEXT = "string",
}

export enum DateFieldTypeData {
  BOOKING_START_DATE = "booking_start_date",
  BOOKING_CREATED_DATE = "booking_created_date",
}
