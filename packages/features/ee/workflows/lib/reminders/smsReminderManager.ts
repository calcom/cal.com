import dayjs from "@calcom/dayjs";
import {
  getAttendeeToBeUsedInSMS,
  getSMSMessageWithVariables,
  shouldUseTwilio,
} from "@calcom/ee/workflows/lib/reminders/utils";
import { SENDER_ID } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { WorkflowTemplates, WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalEventResponses, RecurringEvent } from "@calcom/types/Calendar";

import { isAttendeeAction } from "../actionHelperFunctions";
import { getSenderId } from "../alphanumericSenderIdSupport";
import { WorkflowOptOutContactRepository } from "../repository/workflowOptOutContact";
import { WorkflowOptOutService } from "../service/workflowOptOutService";
import type { ScheduleReminderArgs } from "./emailReminderManager";
import { scheduleSmsOrFallbackEmail, sendSmsOrFallbackEmail } from "./messageDispatcher";
import * as twilio from "./providers/twilioProvider";
import smsReminderTemplate from "./templates/smsReminderTemplate";

export enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}
const log = logger.getSubLogger({ prefix: ["[smsReminderManager]"] });

export type AttendeeInBookingInfo = {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  timeZone: string;
  language: { locale: string };
};

export type BookingInfo = {
  uid?: string | null;
  bookerUrl: string;
  attendees: AttendeeInBookingInfo[];
  organizer: {
    language: { locale: string };
    name: string;
    email: string;
    timeZone: string;
    timeFormat?: TimeFormat;
    username?: string;
  };
  eventType?: {
    slug: string;
    recurringEvent?: RecurringEvent | null;
    customReplyToEmail?: string | null;
  };
  startTime: string;
  endTime: string;
  title: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  metadata?: Prisma.JsonValue;
  cancellationReason?: string | null;
  rescheduleReason?: string | null;
  hideOrganizerEmail?: boolean;
};

export type ScheduleTextReminderAction = Extract<
  WorkflowActions,
  "SMS_ATTENDEE" | "SMS_NUMBER" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER"
>;
export interface ScheduleTextReminderArgs extends ScheduleReminderArgs {
  reminderPhone: string | null;
  message: string;
  action: ScheduleTextReminderAction;
  userId?: number | null;
  teamId?: number | null;
  isVerificationPending?: boolean;
  prisma?: PrismaClient;
  verifiedAt: Date | null;
}

export const scheduleSMSReminder = async (args: ScheduleTextReminderArgs) => {
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
    isVerificationPending = false,
    seatReferenceUid,
    verifiedAt,
  } = args;

  if (!verifiedAt) {
    log.warn(`Workflow step ${workflowStepId} not yet verified`);
    return;
  }

  if (reminderPhone && (await WorkflowOptOutContactRepository.isOptedOut(reminderPhone))) {
    log.warn(
      `Phone number opted out of SMS workflows`,
      safeStringify({ workflowStep: workflowStepId, eventUid: evt.uid })
    );
    return;
  }

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;
  const timeUnit: timeUnitLowerCase | undefined = timeSpan.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  let scheduledDate = null;

  const senderID = getSenderId(reminderPhone, sender || SENDER_ID);

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
    if (!!verifiedNumber) return true;
    return isVerificationPending;
  }
  const isNumberVerified = await getIsNumberVerified();

  if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(startTime).subtract(timeSpan.time, timeUnit) : null;
  } else if (triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(endTime).add(timeSpan.time, timeUnit) : null;
  }

  if (reminderPhone && isNumberVerified) {
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

      if (smsMessage.length > 0) {
        const smsMessageWithoutOptOut = smsMessage;

        if (process.env.TWILIO_OPT_OUT_ENABLED === "true") {
          smsMessage = await WorkflowOptOutService.addOptOutMessage(
            smsMessage,
            evt.organizer.language.locale
          );
        }
        // Allows debugging generated email content without waiting for sendgrid to send emails
        log.debug(`Sending sms for trigger ${triggerEvent}`, smsMessage);

        if (
          triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
          triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ||
          triggerEvent === WorkflowTriggerEvents.RESCHEDULE_EVENT
        ) {
          try {
            await sendSmsOrFallbackEmail({
              twilioData: {
                phoneNumber: reminderPhone,
                body: smsMessage,
                sender: senderID,
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
                sender: senderID,
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
