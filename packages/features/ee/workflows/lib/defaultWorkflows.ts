import { SENDER_NAME } from "@calcom/lib/constants";
import { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

export const GLOBAL_WORKFLOWS = [
  {
    name: "GLOBAL_Email Reminder 24 Hours Before",
    time: 24,
    timeUnit: TimeUnit.HOUR,
    trigger: WorkflowTriggerEvents.BEFORE_EVENT,
    steps: {
      create: [
        {
          stepNumber: 1,
          action: WorkflowActions.EMAIL_ATTENDEE,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
        {
          stepNumber: 2,
          action: WorkflowActions.EMAIL_HOST,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
      ],
    },
  },
  {
    name: "GLOBAL_Email Reminder 1 Hour Before",
    time: 1,
    timeUnit: TimeUnit.HOUR,
    trigger: WorkflowTriggerEvents.BEFORE_EVENT,
    steps: {
      create: [
        {
          stepNumber: 1,
          action: WorkflowActions.EMAIL_ATTENDEE,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
        {
          stepNumber: 2,
          action: WorkflowActions.EMAIL_HOST,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
      ],
    },
  },
];
