import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import {
  WorkflowTriggerEvents,
  WorkflowTemplates,
  WorkflowActions,
  WorkflowMethods,
} from "@calcom/prisma/enums";

import { isAttendeeAction } from "../actionHelperFunctions";
import { scheduleSmsOrFallbackEmail, sendSmsOrFallbackEmail } from "./messageDispatcher";
import type { ScheduleTextReminderArgs, timeUnitLowerCase } from "./smsReminderManager";
import { deleteScheduledSMSReminder } from "./smsReminderManager";
import {
  whatsappEventCancelledTemplate,
  whatsappEventCompletedTemplate,
  whatsappEventRescheduledTemplate,
  whatsappReminderTemplate,
} from "./templates/whatsapp";

const log = logger.getSubLogger({ prefix: ["[whatsappReminderManager]"] });

export const scheduleWhatsappReminder = async (args: ScheduleTextReminderArgs) => {
  const {
    evt,
    reminderPhone,
    triggerEvent,
    action,
    timeSpan,
    message = "",
    workflowStepId,
    template,
    userId,
    teamId,
    isVerificationPending = false,
    seatReferenceUid,
    verifiedAt,
  } = args;

  if (!verifiedAt) {
    log.warn(`Workflow step ${workflowStepId} not verified`);
    return;
  }

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined = timeSpan.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  let scheduledDate = null;

  //WHATSAPP_ATTENDEE action does not need to be verified
  //isVerificationPending is from all already existing workflows (once they edit their workflow, they will also have to verify the number)
  async function getIsNumberVerified() {
    if (action === WorkflowActions.WHATSAPP_ATTENDEE) return true;
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

  const name = action === WorkflowActions.WHATSAPP_ATTENDEE ? evt.attendees[0].name : evt.organizer.name;
  const attendeeName =
    action === WorkflowActions.WHATSAPP_ATTENDEE ? evt.organizer.name : evt.attendees[0].name;
  const timeZone =
    action === WorkflowActions.WHATSAPP_ATTENDEE ? evt.attendees[0].timeZone : evt.organizer.timeZone;

  let textMessage = message;

  switch (template) {
    case WorkflowTemplates.REMINDER:
      textMessage =
        whatsappReminderTemplate(
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
      break;
    case WorkflowTemplates.CANCELLED:
      textMessage =
        whatsappEventCancelledTemplate(
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
      break;
    case WorkflowTemplates.RESCHEDULED:
      textMessage =
        whatsappEventRescheduledTemplate(
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
      break;
    case WorkflowTemplates.COMPLETED:
      textMessage =
        whatsappEventCompletedTemplate(
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
      break;
    default:
      textMessage =
        whatsappReminderTemplate(
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

  // Allows debugging generated whatsapp content without waiting for twilio to send whatsapp messages
  log.debug(`Sending Whatsapp for trigger ${triggerEvent}`, textMessage);
  if (textMessage.length > 0 && reminderPhone && isNumberVerified) {
    //send WHATSAPP when event is booked/cancelled/rescheduled
    if (
      triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ||
      triggerEvent === WorkflowTriggerEvents.RESCHEDULE_EVENT
    ) {
      try {
        await sendSmsOrFallbackEmail({
          twilioData: {
            phoneNumber: reminderPhone,
            body: textMessage,
            sender: "",
            bookingUid: evt.uid,
            userId,
            teamId,
            isWhatsapp: true,
          },
          fallbackData: isAttendeeAction(action)
            ? {
                email: evt.attendees[0].email,
                t: await getTranslation(evt.attendees[0].language.locale ?? "en", "common"),
                replyTo: evt.organizer.email,
              }
            : undefined,
        });
      } catch (error) {
        console.log(`Error sending WHATSAPP with error ${error}`);
      }
    } else if (
      (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT ||
        triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) &&
      scheduledDate
    ) {
      // schedule at least 15 minutes in advance and at most 2 hours in advance
      if (
        currentDate.isBefore(scheduledDate.subtract(15, "minute")) &&
        !scheduledDate.isAfter(currentDate.add(2, "hour"))
      ) {
        try {
          const scheduledNotification = await scheduleSmsOrFallbackEmail({
            twilioData: {
              phoneNumber: reminderPhone,
              body: textMessage,
              scheduledDate: scheduledDate.toDate(),
              sender: "",
              bookingUid: evt.uid ?? "",
              userId,
              teamId,
              isWhatsapp: true,
            },
            fallbackData: isAttendeeAction(action)
              ? {
                  email: evt.attendees[0].email,
                  t: await getTranslation(evt.attendees[0].language.locale ?? "en", "common"),
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
                method: WorkflowMethods.WHATSAPP,
                scheduledDate: scheduledDate.toDate(),
                scheduled: true,
                referenceId: scheduledNotification.sid,
                seatReferenceId: seatReferenceUid,
              },
            });
          }
        } catch (error) {
          console.log(`Error scheduling WHATSAPP with error ${error}`);
        }
      } else if (scheduledDate.isAfter(currentDate.add(2, "hour"))) {
        // Write to DB and send to CRON if scheduled reminder date is past 2 hours from now
        await prisma.workflowReminder.create({
          data: {
            bookingUid: uid,
            workflowStepId: workflowStepId,
            method: WorkflowMethods.WHATSAPP,
            scheduledDate: scheduledDate.toDate(),
            scheduled: false,
            seatReferenceId: seatReferenceUid,
          },
        });
      }
    }
  }
};

export const deleteScheduledWhatsappReminder = deleteScheduledSMSReminder;
