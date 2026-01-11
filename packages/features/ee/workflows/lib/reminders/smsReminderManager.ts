import dayjs from "@calcom/dayjs";
import {
  getAttendeeToBeUsedInSMS,
  getSMSMessageWithVariables,
  shouldUseTwilio,
} from "@calcom/ee/workflows/lib/reminders/utils";
import type { CreditCheckFn } from "@calcom/features/ee/billing/credit-service";
import { getSubmitterEmail } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation";
import { SENDER_ID } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { WorkflowTemplates, WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { isAttendeeAction } from "../actionHelperFunctions";
import { getSenderId } from "../alphanumericSenderIdSupport";
import { IMMEDIATE_WORKFLOW_TRIGGER_EVENTS } from "../constants";
import { WorkflowOptOutContactRepository } from "../repository/workflowOptOutContact";
import { WorkflowOptOutService } from "../service/workflowOptOutService";
import type { FormSubmissionData, BookingInfo } from "../types";
import type { ScheduleReminderArgs } from "./emailReminderManager";
import { scheduleSmsOrFallbackEmail, sendSmsOrFallbackEmail } from "./messageDispatcher";
import * as twilio from "./providers/twilioProvider";
import customTemplate, { transformRoutingFormResponsesToVariableFormat } from "./templates/customTemplate";
import smsReminderTemplate from "./templates/smsReminderTemplate";

export enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}
const log = logger.getSubLogger({ prefix: ["[smsReminderManager]"] });

export type ScheduleTextReminderAction = Extract<
  WorkflowActions,
  "SMS_ATTENDEE" | "SMS_NUMBER" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER"
>;
export type ScheduleTextReminderArgs = ScheduleReminderArgs & {
  reminderPhone: string | null;
  message: string;
  action: ScheduleTextReminderAction;
  userId?: number | null;
  teamId?: number | null;
  isVerificationPending?: boolean;
  prisma?: PrismaClient;
  verifiedAt: Date | null;
  creditCheckFn: CreditCheckFn;
};

export type ScheduleTextReminderArgsWithRequiredFields = Omit<
  ScheduleTextReminderArgs,
  "reminderPhone" | "sender"
> & {
  reminderPhone: string; // Required, not nullable
  sender: string; // Required, not nullable
};

export const scheduleSMSReminder = async (args: ScheduleTextReminderArgs) => {
  const { reminderPhone, sender, verifiedAt, workflowStepId, action, userId, teamId, isVerificationPending } =
    args;
  if (!verifiedAt) {
    log.warn(`Workflow step ${workflowStepId} not yet verified`);
    return;
  }

  if (!reminderPhone) {
    log.warn(`No phone number provided for WhatsApp reminder in workflow step ${workflowStepId}`);
    return;
  }

  if (await WorkflowOptOutContactRepository.isOptedOut(reminderPhone)) {
    log.warn(`Phone number opted out of SMS workflows`, safeStringify({ workflowStep: workflowStepId }));
    return;
  }

  const senderID = getSenderId(reminderPhone, sender || SENDER_ID);
  const params: ScheduleTextReminderArgs = {
    ...args,
    sender: senderID,
  };

  //SMS_ATTENDEE action does not need to be verified
  //isVerificationPending is from all already existing workflows (once they edit their workflow, they will also have to verify the number)
  async function getIsNumberVerified() {
    if (action === WorkflowActions.SMS_ATTENDEE) return true;
    const verifiedNumber = await prisma.verifiedNumber.findFirst({
      where: {
        OR: [{ userId }, { teamId }],
        phoneNumber: reminderPhone || "",
      },
    });
    if (verifiedNumber) return true;
    return isVerificationPending;
  }

  const isNumberVerified = await getIsNumberVerified();

  if (!isNumberVerified) {
    log.warn(`Phone number not verified`, safeStringify({ reminderPhone, isNumberVerified }));
    return;
  }

  if (params.evt) {
    await scheduleSMSReminderForEvt(
      params as ScheduleTextReminderArgsWithRequiredFields & { evt: BookingInfo }
    );
  } else {
    await scheduleSMSReminderForForm(
      params as ScheduleTextReminderArgsWithRequiredFields & {
        formData: FormSubmissionData;
      }
    );
  }
};

const scheduleSMSReminderForEvt = async (
  args: ScheduleTextReminderArgsWithRequiredFields & { evt: BookingInfo }
) => {
  const {
    evt,
    reminderPhone,
    triggerEvent,
    action,
    timeSpan,
    message = "",
    workflowStepId,
    template,
    sender,
    userId,
    teamId,
    seatReferenceUid,
    creditCheckFn,
  } = args;

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;
  const timeUnit: timeUnitLowerCase | undefined = timeSpan.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  let scheduledDate = null;

  if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(startTime).subtract(timeSpan.time, timeUnit) : null;
  } else if (triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(endTime).add(timeSpan.time, timeUnit) : null;
  }

  const useTwilio = shouldUseTwilio(triggerEvent, scheduledDate);
  if (useTwilio) {
    const attendeeToBeUsedInSMS = getAttendeeToBeUsedInSMS(action, evt, reminderPhone);

    const name = action === WorkflowActions.SMS_ATTENDEE ? attendeeToBeUsedInSMS.name : "";
    const attendeeName =
      action === WorkflowActions.SMS_ATTENDEE ? evt.organizer.name : attendeeToBeUsedInSMS.name;
    const timeZone =
      action === WorkflowActions.SMS_ATTENDEE ? attendeeToBeUsedInSMS.timeZone : evt.organizer.timeZone;

    let smsMessage = message;

    if (smsMessage) {
      smsMessage = await getSMSMessageWithVariables(smsMessage, evt, attendeeToBeUsedInSMS, action);
    } else if (template === WorkflowTemplates.REMINDER) {
      smsMessage =
        smsReminderTemplate(
          false,
          evt.organizer.language.locale,
          action,
          evt.organizer.timeFormat,
          evt.startTime,
          evt.title,
          timeZone,
          attendeeName,
          name
        ) || message;
    }

    if (smsMessage.trim().length > 0) {
      const smsMessageWithoutOptOut = await WorkflowOptOutService.addOptOutMessage(
        smsMessage,
        evt.organizer.language.locale
      );

      // Allows debugging generated email content without waiting for sendgrid to send emails
      log.debug(`Sending sms for trigger ${triggerEvent}`, smsMessage);

      if (IMMEDIATE_WORKFLOW_TRIGGER_EVENTS.includes(triggerEvent)) {
        try {
          await sendSmsOrFallbackEmail({
            twilioData: {
              phoneNumber: reminderPhone,
              body: smsMessage,
              sender,
              bodyWithoutOptOut: smsMessageWithoutOptOut,
              bookingUid: evt.uid,
              userId,
              teamId,
            },
            fallbackData: isAttendeeAction(action)
              ? {
                  email: evt.attendees[0].email,
                  t: await getTranslation(evt.attendees[0].language.locale, "common"),
                  replyTo: evt.organizer.email,
                }
              : undefined,
            creditCheckFn,
          });
        } catch (error) {
          log.error(`Error sending SMS with error ${error}`);
        }
      }

      if (
        (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT ||
          triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) &&
        scheduledDate
      ) {
        try {
          // schedule at least 15 minutes in advance and at most 2 hours in advance
          const scheduledNotification = await scheduleSmsOrFallbackEmail({
            twilioData: {
              phoneNumber: reminderPhone,
              body: smsMessage,
              scheduledDate: scheduledDate.toDate(),
              sender,
              bookingUid: evt.uid,
              userId,
              teamId,
            },
            fallbackData: isAttendeeAction(action)
              ? {
                  email: evt.attendees[0].email,
                  t: await getTranslation(evt.attendees[0].language.locale, "common"),
                  replyTo: evt.organizer.email,
                  workflowStepId,
                }
              : undefined,
            creditCheckFn,
          });

          if (scheduledNotification?.sid) {
            await prisma.workflowReminder.create({
              data: {
                bookingUid: uid,
                workflowStepId: workflowStepId,
                method: WorkflowMethods.SMS,
                scheduledDate: scheduledDate.toDate(),
                scheduled: true,
                referenceId: scheduledNotification.sid,
                seatReferenceId: seatReferenceUid,
              },
            });
          }
        } catch (error) {
          log.error(`Error scheduling SMS with error ${error}`);
        }
      }
    }
    return;
  }

  if (!useTwilio && scheduledDate) {
    // Write to DB and send to CRON if scheduled reminder date is past 2 hours from now
    await prisma.workflowReminder.create({
      data: {
        bookingUid: uid,
        workflowStepId: workflowStepId,
        method: WorkflowMethods.SMS,
        scheduledDate: scheduledDate.toDate(),
        scheduled: false,
        seatReferenceId: seatReferenceUid,
      },
    });
  }
};

// sends all immediately, no scheduling needed
const scheduleSMSReminderForForm = async (
  args: ScheduleTextReminderArgsWithRequiredFields & {
    formData: FormSubmissionData;
  }
) => {
  const { message, triggerEvent, reminderPhone, sender, userId, teamId, action, formData, creditCheckFn } =
    args;

  let smsMessage = message;

  if (smsMessage && formData.responses) {
    const timeFormat = getTimeFormatStringFromUserTimeFormat(formData.user.timeFormat);

    const variables = {
      responses: transformRoutingFormResponsesToVariableFormat(formData.responses),
    };

    const processedMessage = customTemplate(smsMessage, variables, formData.user.locale, timeFormat);
    smsMessage = processedMessage.text;
  }

  if (smsMessage.trim().length > 0) {
    const smsMessageWithoutOptOut = await WorkflowOptOutService.addOptOutMessage(
      smsMessage,
      formData.user.locale
    );

    // Allows debugging generated email content without waiting for sendgrid to send emails
    log.debug(`Sending sms for trigger ${triggerEvent}`, smsMessage);

    try {
      const submitterEmail = getSubmitterEmail(formData.responses);

      await sendSmsOrFallbackEmail({
        twilioData: {
          phoneNumber: reminderPhone,
          body: smsMessage,
          sender,
          bodyWithoutOptOut: smsMessageWithoutOptOut,
          userId,
          teamId,
        },
        fallbackData:
          isAttendeeAction(action) && submitterEmail
            ? {
                email: submitterEmail,
                t: await getTranslation(formData.user.locale, "common"),
                replyTo: formData.user.email,
              }
            : undefined,
        creditCheckFn,
      });
    } catch (error) {
      log.error(`Error sending SMS with error ${error}`);
    }
  }
};

export const deleteScheduledSMSReminder = async (reminderId: number, referenceId: string | null) => {
  try {
    if (referenceId) {
      await twilio.cancelSMS(referenceId);
    }

    await prisma.workflowReminder.delete({
      where: {
        id: reminderId,
      },
    });
  } catch (error) {
    log.error(`Error canceling reminder with error ${error}`);
  }
};
