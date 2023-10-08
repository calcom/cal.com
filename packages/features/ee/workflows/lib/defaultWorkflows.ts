import { SENDER_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { WorkflowTriggerEvents, TimeUnit, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

export const GLOBAL_WORKFLOWS = [
  // {
  //   name: "GLOBAL_Email Reminder 24 Hours Before",
  //   time: 24,
  //   timeUnit: TimeUnit.HOUR,
  //   trigger: WorkflowTriggerEvents.BEFORE_EVENT,
  //   steps: {
  //     create: [
  //       {
  //         stepNumber: 1,
  //         action: WorkflowActions.EMAIL_ATTENDEE,
  //         template: WorkflowTemplates.REMINDER,
  //         sender: SENDER_NAME,
  //         numberVerificationPending: false,
  //       },
  //       {
  //         stepNumber: 2,
  //         action: WorkflowActions.EMAIL_HOST,
  //         template: WorkflowTemplates.REMINDER,
  //         sender: SENDER_NAME,
  //         numberVerificationPending: false,
  //       },
  //     ],
  //   },
  // },
  // {
  //   name: "GLOBAL_Email Reminder 1 Hour Before",
  //   time: 1,
  //   timeUnit: TimeUnit.HOUR,
  //   trigger: WorkflowTriggerEvents.BEFORE_EVENT,
  //   steps: {
  //     create: [
  //       {
  //         stepNumber: 1,
  //         action: WorkflowActions.EMAIL_ATTENDEE,
  //         template: WorkflowTemplates.REMINDER,
  //         sender: SENDER_NAME,
  //         numberVerificationPending: false,
  //       },
  //       {
  //         stepNumber: 2,
  //         action: WorkflowActions.EMAIL_HOST,
  //         template: WorkflowTemplates.REMINDER,
  //         sender: SENDER_NAME,
  //         numberVerificationPending: false,
  //       },
  //     ],
  //   },
  // },
  {
    name: "GLOBAL_SMS Reminder 24H BEFORE_EVENT",
    trigger: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 24,
    timeUnit: TimeUnit.HOUR,
    steps: {
      create: [
        {
          stepNumber: 1,
          action: WorkflowActions.SMS_ATTENDEE,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
        {
          stepNumber: 2,
          action: WorkflowActions.SMS_NUMBER,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
      ],
    },
  },
  {
    name: "GLOBAL_SMS Reminder 1H BEFORE_EVENT",
    trigger: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 1,
    timeUnit: TimeUnit.HOUR,
    steps: {
      create: [
        {
          stepNumber: 1,
          action: WorkflowActions.SMS_ATTENDEE,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
        {
          stepNumber: 2,
          action: WorkflowActions.SMS_NUMBER,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
      ],
    },
  },
  {
    name: "GLOBAL_SMS Reminder NEW_EVENT",
    trigger: WorkflowTriggerEvents.NEW_EVENT,
    steps: {
      create: [
        {
          stepNumber: 1,
          action: WorkflowActions.SMS_ATTENDEE,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
        {
          stepNumber: 2,
          action: WorkflowActions.SMS_NUMBER,
          template: WorkflowTemplates.REMINDER,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
      ],
    },
  },
  // {
  //   name: "GLOBAL_SMS Reminder 1H AFTER_EVENT",
  //   trigger: WorkflowTriggerEvents.AFTER_EVENT,
  //   time: 1,
  //   timeUnit: TimeUnit.HOUR,
  //   steps: {
  //     create: [
  //       {
  //         stepNumber: 1,
  //         action: WorkflowActions.SMS_ATTENDEE,
  //         template: WorkflowTemplates.REMINDER,
  //         sender: SENDER_NAME,
  //         numberVerificationPending: false,
  //       },
  //       {
  //         stepNumber: 2,
  //         action: WorkflowActions.SMS_NUMBER,
  //         template: WorkflowTemplates.REMINDER,
  //         sender: SENDER_NAME,
  //         numberVerificationPending: false,
  //       },
  //     ],
  //   },
  // },
  // {
  //   name: "GLOBAL_SMS Reminder 24H AFTER_EVENT",
  //   trigger: WorkflowTriggerEvents.AFTER_EVENT,
  //   time: 24,
  //   timeUnit: TimeUnit.HOUR,
  //   steps: {
  //     create: [
  //       {
  //         stepNumber: 1,
  //         action: WorkflowActions.SMS_ATTENDEE,
  //         template: WorkflowTemplates.REMINDER,
  //         sender: SENDER_NAME,
  //         numberVerificationPending: false,
  //       },
  //       {
  //         stepNumber: 2,
  //         action: WorkflowActions.SMS_NUMBER,
  //         template: WorkflowTemplates.REMINDER,
  //         sender: SENDER_NAME,
  //         numberVerificationPending: false,
  //       },
  //     ],
  //   },
  // },
  {
    name: "GLOBAL_SMS Reminder EVENT_CANCELLED",
    trigger: WorkflowTriggerEvents.EVENT_CANCELLED,
    steps: {
      create: [
        {
          stepNumber: 1,
          action: WorkflowActions.SMS_ATTENDEE,
          template: WorkflowTemplates.CANCELLED,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
        {
          stepNumber: 2,
          action: WorkflowActions.SMS_NUMBER,
          template: WorkflowTemplates.CANCELLED,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
      ],
    },
  },
  {
    name: "GLOBAL_SMS Reminder RESCHEDULE_EVENT",
    trigger: WorkflowTriggerEvents.RESCHEDULE_EVENT,
    steps: {
      create: [
        {
          stepNumber: 1,
          action: WorkflowActions.SMS_ATTENDEE,
          template: WorkflowTemplates.RESCHEDULED,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
        {
          stepNumber: 2,
          action: WorkflowActions.SMS_NUMBER,
          template: WorkflowTemplates.RESCHEDULED,
          sender: SENDER_NAME,
          numberVerificationPending: false,
        },
      ],
    },
  },
];

export const globalWorkflows = async ({ eventTypeId }: { eventTypeId: number }) => {
  const globalWorkflows = await prisma.workflow.findMany({
    where: {
      name: {
        contains: "GLOBAL_SMS",
      },
    },
    include: {
      steps: true,
    },
  });

  const wfs = globalWorkflows.map((workflow) => {
    return {
      id: 0,
      workflowId: workflow.id,
      eventTypeId: eventTypeId,
      workflow: workflow,
    };
  });

  return wfs;
};
