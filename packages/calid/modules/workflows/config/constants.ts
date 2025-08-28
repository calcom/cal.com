import { TimeUnit, WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

const WORKFLOW_TRIGGER_EVENTS = [
  WorkflowTriggerEvents.BEFORE_EVENT,
  WorkflowTriggerEvents.EVENT_CANCELLED,
  WorkflowTriggerEvents.NEW_EVENT,
  WorkflowTriggerEvents.AFTER_EVENT,
  WorkflowTriggerEvents.RESCHEDULE_EVENT,
  WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
] as const;

const WORKFLOW_ACTIONS = [
  WorkflowActions.EMAIL_HOST,
  WorkflowActions.EMAIL_ATTENDEE,
  WorkflowActions.EMAIL_ADDRESS,
  WorkflowActions.SMS_ATTENDEE,
  WorkflowActions.SMS_NUMBER,
  WorkflowActions.WHATSAPP_ATTENDEE,
  WorkflowActions.WHATSAPP_NUMBER,
] as const;

const TIME_UNITS = [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE] as const;

const WORKFLOW_TEMPLATES = [
  WorkflowTemplates.CUSTOM,
  WorkflowTemplates.REMINDER,
  WorkflowTemplates.RATING,
  WorkflowTemplates.CANCELLED,
  WorkflowTemplates.COMPLETED,
  WorkflowTemplates.RESCHEDULED,
  WorkflowTemplates.THANKYOU,
] as const;

const BASIC_WORKFLOW_TEMPLATES = [WorkflowTemplates.CUSTOM, WorkflowTemplates.REMINDER] as const;

const ATTENDEE_WORKFLOW_TEMPLATES = [
  WorkflowTemplates.CUSTOM,
  WorkflowTemplates.REMINDER,
  WorkflowTemplates.RATING,
  WorkflowTemplates.THANKYOU,
] as const;

const WHATSAPP_WORKFLOW_TEMPLATES = [
  WorkflowTemplates.REMINDER,
  WorkflowTemplates.COMPLETED,
  WorkflowTemplates.CANCELLED,
  WorkflowTemplates.RESCHEDULED,
] as const;

const DYNAMIC_TEXT_VARIABLES = [
  "event_name",
  "event_date",
  "event_time",
  "event_end_time",
  "timezone",
  "location",
  "organizer_name",
  "attendee_name",
  "attendee_first_name",
  "attendee_last_name",
  "attendee_email",
  "additional_notes",
  "meeting_url",
  "cancel_url",
  "reschedule_url",
  "rating_url",
  "no_show_url",
  "attendee_timezone",
  "event_start_time_in_attendee_timezone",
  "event_end_time_in_attendee_timezone",
];

const FORMATTED_DYNAMIC_TEXT_VARIABLES = [
  "event_date_",
  "event_time_",
  "event_end_time_",
  "event_start_time_in_attendee_timezone_",
  "event_end_time_in_attendee_timezone_",
];
// TODO: Move to separate file (types/workflow-enums.ts)
enum TimeFormat {
  TWELVE_HOUR = "h:mma",
  TWENTY_FOUR_HOUR = "HH:mm",
}
enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}

// Re-export constants that might be needed elsewhere
export {
  WORKFLOW_TRIGGER_EVENTS,
  WORKFLOW_ACTIONS,
  TIME_UNITS,
  WORKFLOW_TEMPLATES,
  BASIC_WORKFLOW_TEMPLATES,
  ATTENDEE_WORKFLOW_TEMPLATES,
  WHATSAPP_WORKFLOW_TEMPLATES,
  DYNAMIC_TEXT_VARIABLES,
  FORMATTED_DYNAMIC_TEXT_VARIABLES,
  TimeFormat,
  timeUnitLowerCase,
};
