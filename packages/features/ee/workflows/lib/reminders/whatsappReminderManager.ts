import type { TimeUnit } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import {
  WorkflowTriggerEvents,
  WorkflowTemplates,
  WorkflowActions,
  WorkflowMethods,
} from "@calcom/prisma/enums";

import * as twilio from "./smsProviders/twilioProvider";
import type { BookingInfo, timeUnitLowerCase } from "./smsReminderManager";
import { deleteScheduledSMSReminder } from "./smsReminderManager";
import {
  whatsappEventCancelledTemplate,
  whatsappEventCompletedTemplate,
  whatsappEventRescheduledTemplate,
  whatsappReminderTemplate,
} from "./templates/whatsapp";

const log = logger.getChildLogger({ prefix: ["[whatsappReminderManager]"] });

export const scheduleWhatsappReminder = async (
  evt: BookingInfo,
  reminderPhone: string | null,
  triggerEvent: WorkflowTriggerEvents,
  action: WorkflowActions,
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  },
  message: string,
  workflowStepId: number,
  template: WorkflowTemplates,
  userId?: number | null,
  teamId?: number | null,
  isVerificationPending = false,
  seatReferenceUid?: string
) => {
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

  switch (template) {
    case WorkflowTemplates.REMINDER:
      message =
        whatsappReminderTemplate(
          false,
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
      message =
        whatsappEventCancelledTemplate(
          false,
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
      message =
        whatsappEventRescheduledTemplate(
          false,
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
      message =
        whatsappEventCompletedTemplate(
          false,
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
      message =
        whatsappReminderTemplate(
          false,
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
  log.debug(`Sending Whatsapp for trigger ${triggerEvent}`, message);
  if (message.length > 0 && reminderPhone && isNumberVerified) {
    //send WHATSAPP when event is booked/cancelled/rescheduled
    if (
      triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ||
      triggerEvent === WorkflowTriggerEvents.RESCHEDULE_EVENT
    ) {
      try {
        await twilio.sendSMS(reminderPhone, message, "", true);
      } catch (error) {
        console.log(`Error sending WHATSAPP with error ${error}`);
      }
    } else if (
      (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT ||
        triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) &&
      scheduledDate
    ) {
      // Can only schedule at least 60 minutes in advance and at most 7 days in advance
      if (
        currentDate.isBefore(scheduledDate.subtract(1, "hour")) &&
        !scheduledDate.isAfter(currentDate.add(7, "day"))
      ) {
        try {
          const scheduledWHATSAPP = await twilio.scheduleSMS(
            reminderPhone,
            message,
            scheduledDate.toDate(),
            "",
            true
          );

          await prisma.workflowReminder.create({
            data: {
              bookingUid: uid,
              workflowStepId: workflowStepId,
              method: WorkflowMethods.WHATSAPP,
              scheduledDate: scheduledDate.toDate(),
              scheduled: true,
              referenceId: scheduledWHATSAPP.sid,
              seatReferenceId: seatReferenceUid,
            },
          });
        } catch (error) {
          console.log(`Error scheduling WHATSAPP with error ${error}`);
        }
      } else if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
        // Write to DB and send to CRON if scheduled reminder date is past 7 days
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
