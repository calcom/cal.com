// Domain types - independent of Prisma
// These represent the core business concepts

export const WorkflowTriggerEvents = {
  BEFORE_EVENT: "BEFORE_EVENT",
  AFTER_EVENT: "AFTER_EVENT",
  NEW_EVENT: "NEW_EVENT",
  RESCHEDULE_EVENT: "RESCHEDULE_EVENT",
  CANCEL_EVENT: "CANCEL_EVENT",
  BOOKING_REQUESTED: "BOOKING_REQUESTED",
  FORM_SUBMITTED: "FORM_SUBMITTED",
  FORM_SUBMITTED_NO_EVENT: "FORM_SUBMITTED_NO_EVENT",
} as const;

export type WorkflowTriggerEvents = (typeof WorkflowTriggerEvents)[keyof typeof WorkflowTriggerEvents];

export const TimeUnit = {
  DAY: "DAY",
  HOUR: "HOUR",
  MINUTE: "MINUTE",
} as const;

export type TimeUnit = (typeof TimeUnit)[keyof typeof TimeUnit];

export const WorkflowActions = {
  EMAIL_HOST: "EMAIL_HOST",
  EMAIL_ATTENDEE: "EMAIL_ATTENDEE",
  SMS_ATTENDEE: "SMS_ATTENDEE",
  SMS_NUMBER: "SMS_NUMBER",
  EMAIL_ADDRESS: "EMAIL_ADDRESS",
  WHATSAPP_ATTENDEE: "WHATSAPP_ATTENDEE",
  WHATSAPP_NUMBER: "WHATSAPP_NUMBER",
  AI_PHONE_CALL_ATTENDEE: "AI_PHONE_CALL_ATTENDEE",
  AI_PHONE_CALL_NUMBER: "AI_PHONE_CALL_NUMBER",
} as const;

export type WorkflowActions = (typeof WorkflowActions)[keyof typeof WorkflowActions];

export const WorkflowTemplates = {
  REMINDER: "REMINDER",
  CUSTOM: "CUSTOM",
  CANCELLED: "CANCELLED",
  RESCHEDULED: "RESCHEDULED",
  COMPLETED: "COMPLETED",
} as const;

export type WorkflowTemplates = (typeof WorkflowTemplates)[keyof typeof WorkflowTemplates];

export const WorkflowType = {
  EVENT_TYPE: "EVENT_TYPE",
  ROUTING_FORM: "ROUTING_FORM",
} as const;

export type WorkflowType = (typeof WorkflowType)[keyof typeof WorkflowType];
