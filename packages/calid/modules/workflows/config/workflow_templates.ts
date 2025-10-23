import { TimeUnit, WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

export type WorkflowBuilderTemplateFields = {
  // actionType: WorkflowActions;
  // template: WorkflowTemplates;
  // trigger: WorkflowTriggerEvents;

  name: string;
  actionType: string;
  template: string;
  trigger: string;
  time: number | null;
};

export interface WorkflowTemplate {
  name: string;
  description: string;
  actionType: string;
  template: string;
  triggerEvent: string;
  time: number;
  icon: string;
}

export const templates: WorkflowTemplate[] = [
  {
    name: "Email reminder to host",
    description: "Never miss an event — get automated email reminders",
    actionType: WorkflowActions.EMAIL_HOST,
    template: WorkflowTemplates.REMINDER,
    triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 30,
    icon: "mail",
  },
  {
    name: "Email reminder to invitee",
    description: "Reduce no-shows — send automated email reminders to invitees",
    actionType: WorkflowActions.EMAIL_ATTENDEE,
    template: WorkflowTemplates.REMINDER,
    triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 30,
    icon: "mail",
  },
  {
    name: "Send thank you email",
    description: "Build relationships with a quick thanks",
    actionType: WorkflowActions.EMAIL_ATTENDEE,
    template: WorkflowTemplates.THANKYOU,
    triggerEvent: WorkflowTriggerEvents.AFTER_EVENT,
    time: 1,
    icon: "mail",
  },
  {
    name: "Text reminder to invitees",
    description: "Never miss an event — set automated text reminders",

    actionType: WorkflowActions.SMS_ATTENDEE,
    template: WorkflowTemplates.REMINDER,
    triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 30,
    icon: "mail",
  },
  {
    name: "WhatsApp reminder to invitees",
    description: "Never miss an event — set automated text reminders",
    actionType: WorkflowActions.WHATSAPP_ATTENDEE,
    template: WorkflowTemplates.REMINDER,
    triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 30,
    icon: "mail",
  },
  {
    name: "Text cancellation notification to attendee",
    description: "Keep attendees up-to-date with canceled events",
    actionType: WorkflowActions.SMS_ATTENDEE,
    template: WorkflowTemplates.CANCELLED,
    triggerEvent: WorkflowTriggerEvents.EVENT_CANCELLED,
    time: 1,
    icon: "mail",
  },
];
