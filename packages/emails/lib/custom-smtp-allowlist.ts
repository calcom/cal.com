export const CUSTOM_SMTP_ALLOWED_EMAILS = [
  "SEND_BROKEN_INTEGRATION",

  // Attendee booking emails
  "AttendeeAddGuestsEmail",
  "AttendeeAwaitingPaymentEmail",
  "AttendeeCancelledEmail",
  "AttendeeCancelledSeatEmail",
  "AttendeeDeclinedEmail",
  "AttendeeLocationChangeEmail",
  "AttendeeRequestEmail",
  "AttendeeRescheduledEmail",
  "SEND_BOOKING_CONFIRMATION", // AttendeeScheduledEmail + OrganizerScheduledEmail
  "AttendeeUpdatedEmail",
  "AttendeeWasRequestedToRescheduleEmail",

  // Recording/transcript emails (attendee + organizer variants share these values)
  "SEND_RECORDING_DOWNLOAD_LINK",
  "SEND_TRANSCRIPT_DOWNLOAD_LINK",

  // Organizer booking emails
  "OrganizerAddAttendeeEmail",
  "OrganizerAddGuestsEmail",
  "OrganizerAttendeeCancelledSeatEmail",
  "OrganizerCancelledEmail",
  "OrganizerLocationChangeEmail",
  "OrganizerPaymentRefundFailedEmail",
  "OrganizerReassignedEmail",
  "OrganizerRequestEmail",
  "OrganizerRequestReminderEmail",
  "OrganizerRequestedToRescheduleEmail",
  "OrganizerRescheduledEmail",

  // Payment emails
  "NoShowFeeChargedEmail",

  // Workflow emails
  "WorkflowEmail",

  // Routing forms emails
  "ResponseEmail",
] as const;

export type CustomSmtpAllowedEmail = (typeof CUSTOM_SMTP_ALLOWED_EMAILS)[number];
