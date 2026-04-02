import { TimeUnit, WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

export const WORKFLOW_TRIGGER_EVENTS = [
  WorkflowTriggerEvents.BEFORE_EVENT,
  WorkflowTriggerEvents.EVENT_CANCELLED,
  WorkflowTriggerEvents.NEW_EVENT,
  WorkflowTriggerEvents.AFTER_EVENT,
  WorkflowTriggerEvents.RESCHEDULE_EVENT,
  WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  WorkflowTriggerEvents.FORM_SUBMITTED,
  WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
  WorkflowTriggerEvents.BOOKING_REJECTED,
  WorkflowTriggerEvents.BOOKING_REQUESTED,
  WorkflowTriggerEvents.BOOKING_PAYMENT_INITIATED,
  WorkflowTriggerEvents.BOOKING_PAID,
  WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED,
] as const;

export const WORKFLOW_ACTIONS = [
  WorkflowActions.EMAIL_HOST,
  WorkflowActions.EMAIL_ATTENDEE,
  WorkflowActions.EMAIL_ADDRESS,
  WorkflowActions.SMS_ATTENDEE,
  WorkflowActions.SMS_NUMBER,
  WorkflowActions.WHATSAPP_ATTENDEE,
  WorkflowActions.WHATSAPP_NUMBER,
  WorkflowActions.CAL_AI_PHONE_CALL,
] as const;

export const TIME_UNIT = [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE] as const;

export const WORKFLOW_TEMPLATES = [
  WorkflowTemplates.CUSTOM,
  WorkflowTemplates.REMINDER,
  WorkflowTemplates.RATING,
  WorkflowTemplates.CANCELLED,
  WorkflowTemplates.COMPLETED,
  WorkflowTemplates.RESCHEDULED,
] as const;

export const BASIC_WORKFLOW_TEMPLATES = [WorkflowTemplates.CUSTOM, WorkflowTemplates.REMINDER] as const;

export const ATTENDEE_WORKFLOW_TEMPLATES = [
  WorkflowTemplates.CUSTOM,
  WorkflowTemplates.REMINDER,
  WorkflowTemplates.RATING,
] as const;

export const WHATSAPP_WORKFLOW_TEMPLATES = [
  WorkflowTemplates.REMINDER,
  WorkflowTemplates.COMPLETED,
  WorkflowTemplates.CANCELLED,
  WorkflowTemplates.RESCHEDULED,
] as const;

export const DYNAMIC_TEXT_VARIABLES = [
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
  "cancel_reason",
  "reschedule_url",
  "reschedule_reason",
  "rating_url",
  "no_show_url",
  "attendee_timezone",
  "event_start_time_in_attendee_timezone",
  "event_end_time_in_attendee_timezone",
];

export const FORMATTED_DYNAMIC_TEXT_VARIABLES = [
  "event_date_",
  "event_time_",
  "event_end_time_",
  "event_start_time_in_attendee_timezone_",
  "event_end_time_in_attendee_timezone_",
];

export const IMMEDIATE_WORKFLOW_TRIGGER_EVENTS: WorkflowTriggerEvents[] = [
  WorkflowTriggerEvents.NEW_EVENT,
  WorkflowTriggerEvents.EVENT_CANCELLED,
  WorkflowTriggerEvents.RESCHEDULE_EVENT,
  WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED,
  WorkflowTriggerEvents.BOOKING_PAID,
  WorkflowTriggerEvents.BOOKING_PAYMENT_INITIATED,
  WorkflowTriggerEvents.BOOKING_REJECTED,
  WorkflowTriggerEvents.BOOKING_REQUESTED,
  WorkflowTriggerEvents.FORM_SUBMITTED,
  WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT, // no real immediate workflow but it's scheduled with tasker
];

export const FORM_TRIGGER_WORKFLOW_EVENTS: WorkflowTriggerEvents[] = [
  WorkflowTriggerEvents.FORM_SUBMITTED,
  WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
];

export const ALLOWED_FORM_WORKFLOW_ACTIONS = [
  WorkflowActions.EMAIL_ATTENDEE,
  WorkflowActions.EMAIL_ADDRESS,
  WorkflowActions.SMS_ATTENDEE,
  WorkflowActions.SMS_NUMBER,
  WorkflowActions.CAL_AI_PHONE_CALL,
] as const;
