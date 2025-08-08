import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { TimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import {
  WorkflowTriggerEvents,
  WorkflowTemplates,
  WorkflowActions,
  WorkflowMethods,
} from "@calcom/prisma/enums";

import type { timeUnitLowerCase } from "../config/constants";
import type { ScheduleTextReminderArgs } from "../config/types";
import { deleteScheduledSMSReminder } from "../managers/smsManager";
import * as twilio from "../providers/twilio";
import {
  whatsappEventCancelledTemplate,
  whatsappEventCompletedTemplate,
  whatsappEventRescheduledTemplate,
  whatsappReminderTemplate,
} from "../templates/whatsapp";

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
  } = args;

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined = timeSpan.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  let scheduledDate: Dayjs | null = null;

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
          evt.eventType.title ?? evt.title,
          timeZone,
          attendeeName.split(" ")[0],
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
          evt.eventType.title,
          timeZone,
          attendeeName.split(" ")[0],
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
          evt.eventType.title,
          timeZone,
          attendeeName.split(" ")[0],
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
          evt.eventType.title ?? evt.title,
          timeZone,
          attendeeName.split(" ")[0],
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
          evt.eventType.title ?? evt.title,
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
        const contentVars = twilio.generateContentVars(
          {
            workflowStep: {
              action: action,
              template: template,
            },
            booking: {
              eventType: { title: evt.eventType.title ?? evt.title },
              user: {
                locale: evt.organizer.language.locale,
                timeFormat: evt.organizer.timeFormat === TimeFormat.TWENTY_FOUR_HOUR ? 24 : 12,
              },
              startTime: new Date(evt.startTime),
            },
          },
          evt.attendees[0].name || "",
          evt.organizer.name || "",
          timeZone || ""
        );

        await twilio.sendSMS(
          reminderPhone,
          textMessage,
          "",
          userId,
          teamId,
          true,
          template,
          JSON.stringify(contentVars),
          {
            eventTypeId: evt.eventType.id,
          }
        );
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
          const contentVars = twilio.generateContentVars(
            {
              workflowStep: {
                action: action,
                template: template,
              },
              booking: {
                eventType: { title: evt.eventType.title ?? evt.title },
                user: {
                  locale: evt.organizer.language.locale,
                  timeFormat: evt.organizer.timeFormat === TimeFormat.TWENTY_FOUR_HOUR ? 24 : 12,
                },
                startTime: new Date(evt.startTime),
              },
            },
            evt.attendees[0].name || "",
            evt.organizer.name || "",
            timeZone || ""
          );

          const scheduledWHATSAPP = await twilio.scheduleSMS(
            reminderPhone,
            "",
            scheduledDate.toDate(),
            "",
            userId,
            teamId,
            true,
            template,
            JSON.stringify(contentVars),
            {
              eventTypeId: evt.eventType.id,
            }
          );
          if (scheduledWHATSAPP) {
            await prisma.workflowReminder.create({
              data: {
                bookingUid: uid,
                workflowStepId: workflowStepId,
                method: WorkflowMethods.WHATSAPP,
                scheduledDate: scheduledDate.toDate(),
                scheduled: true,
                referenceId: scheduledWHATSAPP.sid,
                seatReferenceId: seatReferenceUid,
                ...(evt.attendees[0].id && { attendeeId: evt.attendees[0].id }),
              },
            });
          }
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
            ...(evt.attendees[0].id && { attendeeId: evt.attendees[0].id }),
          },
        });
      }
    }
  }
};

export const deleteScheduledWhatsappReminder = deleteScheduledSMSReminder;
