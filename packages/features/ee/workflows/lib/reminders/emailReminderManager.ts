import dayjs from "@calcom/dayjs";
import { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import { EmailWorkflowService } from "@calcom/features/ee/workflows/lib/service/EmailWorkflowService";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/repositories/WorkflowReminderRepository";
import tasker from "@calcom/features/tasker";
import logger from "@calcom/lib/logger";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WorkflowMethods, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

import type { BookingInfo, ScheduleEmailReminderAction, FormSubmissionData } from "../types";
import { sendOrScheduleWorkflowEmails } from "./providers/emailProvider";
import type { WorkflowContextData } from "./reminderScheduler";
import type { VariablesType } from "./templates/customTemplate";
import customTemplate, { transformRoutingFormResponsesToVariableFormat } from "./templates/customTemplate";

const log = logger.getSubLogger({ prefix: ["[emailReminderManager]"] });

export type ScheduleReminderArgs = {
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  };
  template?: WorkflowTemplates;
  sender?: string | null;
  workflowStepId?: number;
  seatReferenceUid?: string;
} & WorkflowContextData;

type scheduleEmailReminderArgs = ScheduleReminderArgs & {
  sendTo: string[];
  action: ScheduleEmailReminderAction;
  emailSubject?: string;
  emailBody?: string;
  hideBranding?: boolean;
  includeCalendarEvent?: boolean;
  verifiedAt: Date | null;
};

type SendEmailReminderParams = {
  mailData: {
    subject: string;
    html: string;
    replyTo?: string;
    attachments?: {
      content: string;
      filename: string;
      contentType: string;
      disposition: string;
    }[];
    sender?: string | null;
  };
  sendTo: string[];
  triggerEvent: WorkflowTriggerEvents;
  scheduledDate?: Date | null;
  uid?: string;
  workflowStepId?: number;
  seatReferenceUid?: string;
};

const sendOrScheduleWorkflowEmailWithReminder = async (params: SendEmailReminderParams) => {
  const { mailData, sendTo, scheduledDate, uid, workflowStepId } = params;

  let reminderUid;
  if (scheduledDate) {
    const reminder = await prisma.workflowReminder.create({
      data: {
        bookingUid: uid,
        workflowStepId,
        method: WorkflowMethods.EMAIL,
        scheduledDate,
        scheduled: true,
      },
    });
    reminderUid = reminder.uuid;
  }

  await sendOrScheduleWorkflowEmails({
    ...mailData,
    to: sendTo,
    sendAt: scheduledDate,
    referenceUid: reminderUid ?? undefined,
  });
};

export const scheduleEmailReminder = async (args: scheduleEmailReminderArgs) => {
  const { verifiedAt, workflowStepId } = args;
  if (!verifiedAt) {
    log.warn(`Workflow step ${workflowStepId} not yet verified`);
    return;
  }

  if (args.evt) {
    await scheduleEmailReminderForEvt(args);
  } else {
    await scheduleEmailReminderForForm(args);
  }
};

const scheduleEmailReminderForEvt = async (args: scheduleEmailReminderArgs & { evt: BookingInfo }) => {
  const {
    evt,
    triggerEvent,
    timeSpan,
    template,
    sender,
    workflowStepId,
    seatReferenceUid,
    sendTo,
    emailSubject = "",
    emailBody = "",
    hideBranding,
    includeCalendarEvent,
    action,
  } = args;

  const uid = evt.uid as string;

  const scheduledDate = WorkflowService.processWorkflowScheduledDate({
    workflowTriggerEvent: triggerEvent,
    time: timeSpan.time,
    timeUnit: timeSpan.timeUnit,
    evt,
  });

  if (
    scheduledDate &&
    triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT &&
    dayjs(scheduledDate).isBefore(dayjs())
  ) {
    log.debug(
      `Skipping reminder for workflow step ${workflowStepId} - scheduled date ${scheduledDate} is in the past`
    );
    return;
  }

  const workflowReminderRepository = new WorkflowReminderRepository(prisma);
  const bookingSeatRepository = new BookingSeatRepository(prisma);
  const emailWorkflowService = new EmailWorkflowService(workflowReminderRepository, bookingSeatRepository);
  const mailData = await emailWorkflowService.generateEmailPayloadForEvtWorkflow({
    evt,
    sendTo,
    seatReferenceUid,
    hideBranding,
    emailSubject,
    emailBody,
    sender: sender || "",
    action,
    template,
    includeCalendarEvent,
    triggerEvent,
  });

  await sendOrScheduleWorkflowEmailWithReminder({
    mailData,
    sendTo,
    triggerEvent,
    scheduledDate,
    uid,
    workflowStepId,
    seatReferenceUid,
  });
};

// sends all immediately, no scheduling needed
const scheduleEmailReminderForForm = async (
  args: scheduleEmailReminderArgs & {
    formData: FormSubmissionData;
  }
) => {
  const {
    formData,
    triggerEvent,
    sender,
    workflowStepId,
    sendTo,
    emailSubject = "",
    emailBody = "",
    hideBranding,
  } = args;

  const emailContent = {
    emailSubject,
    emailBody: `<body style="white-space: pre-wrap;">${emailBody}</body>`,
  };

  if (emailBody) {
    const timeFormat = getTimeFormatStringFromUserTimeFormat(formData.user.timeFormat);

    const variables: VariablesType = {
      responses: transformRoutingFormResponsesToVariableFormat(formData.responses),
    };

    const emailSubjectTemplate = customTemplate(emailSubject, variables, formData.user.locale, timeFormat);
    emailContent.emailSubject = emailSubjectTemplate.text;
    emailContent.emailBody = customTemplate(
      emailBody,
      variables,
      formData.user.locale,
      timeFormat,
      hideBranding
    ).html;
  }

  // Allows debugging generated email content without waiting for sendgrid to send emails
  log.debug(`Sending Email for trigger ${triggerEvent}`, JSON.stringify(emailContent));

  const mailData = {
    subject: emailContent.emailSubject,
    html: emailContent.emailBody,
    sender,
  };

  await sendOrScheduleWorkflowEmailWithReminder({
    mailData,
    sendTo,
    triggerEvent,
    workflowStepId,
    scheduledDate: null,
  });
};

export const deleteScheduledEmailReminder = async (reminderId: number) => {
  const workflowReminder = await prisma.workflowReminder.findUnique({
    where: {
      id: reminderId,
    },
  });

  if (!workflowReminder) {
    console.error("Workflow reminder not found");
    return;
  }

  const { uuid, referenceId } = workflowReminder;
  if (uuid) {
    try {
      const taskId = await tasker.cancelWithReference(uuid, "sendWorkflowEmails");
      if (taskId) {
        await prisma.workflowReminder.delete({
          where: {
            id: reminderId,
          },
        });

        return;
      }
    } catch (error) {
      log.error(`Error canceling/deleting reminder with tasker. Error: ${error}`);
    }
  }

  /**
   * @deprecated only needed for SendGrid, use SMTP with tasker instead
   */
  try {
    if (!referenceId) {
      await prisma.workflowReminder.delete({
        where: {
          id: reminderId,
        },
      });

      return;
    }

    await prisma.workflowReminder.update({
      where: {
        id: reminderId,
      },
      data: {
        cancelled: true,
      },
    });
  } catch (error) {
    log.error(`Error canceling reminder with error ${error}`);
  }
};
