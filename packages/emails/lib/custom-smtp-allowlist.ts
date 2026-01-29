export const CUSTOM_SMTP_ALLOWED_EMAILS = [
  "BrokenIntegrationEmail",

  // Attendee booking emails
  "AttendeeAddGuestsEmail",
  "AttendeeAwaitingPaymentEmail",
  "AttendeeCancelledEmail",
  "AttendeeCancelledSeatEmail",
  "AttendeeDeclinedEmail",
  "AttendeeLocationChangeEmail",
  "AttendeeRequestEmail",
  "AttendeeRescheduledEmail",
  "AttendeeScheduledEmail",
  "AttendeeUpdatedEmail",
  "AttendeeWasRequestedToRescheduleEmail",

  // Attendee recording/transcript emails
  "AttendeeDailyVideoDownloadRecordingEmail",
  "AttendeeDailyVideoDownloadTranscriptEmail",

  // Organizer booking emails
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
  "OrganizerScheduledEmail",

  // Organizer recording/transcript emails
  "OrganizerDailyVideoDownloadRecordingEmail",
  "OrganizerDailyVideoDownloadTranscriptEmail",

  // Payment emails
  "NoShowFeeChargedEmail",

  // Workflow emails
  "WorkflowEmail",

  // Routing forms emails
  "ResponseEmail",
] as const;

export type CustomSmtpAllowedEmail = (typeof CUSTOM_SMTP_ALLOWED_EMAILS)[number];
