export enum SalesforceRecordEnum {
  CONTACT = "Contact",
  LEAD = "Lead",
  ACCOUNT = "Account",
  EVENT = "Event",
}

export enum WhenToWriteToRecord {
  EVERY_BOOKING = "every_booking",
  FIELD_EMPTY = "field_empty",
}

export enum SalesforceFieldType {
  DATE = "date",
  TEXT = "string",
  PHONE = "phone",
  CUSTOM = "custom",
  PICKLIST = "picklist",
  CHECKBOX = "boolean",
  DATETIME = "datetime",
  TEXTAREA = "textarea",
}

export enum DateFieldTypeData {
  BOOKING_START_DATE = "booking_start_date",
  BOOKING_CREATED_DATE = "booking_created_date",
  BOOKING_CANCEL_DATE = "booking_cancel_date",
}

export enum RoutingReasons {
  ACCOUNT_LOOKUP_FIELD = "account_lookup_field",
  LEAD_OWNER = "lead_owner",
  CONTACT_OWNER = "contact_owner",
  ACCOUNT_OWNER = "account_owner",
}
