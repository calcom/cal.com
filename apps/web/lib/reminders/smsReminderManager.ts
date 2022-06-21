import { WorkflowTriggerEvents, TimeUnit, WorkflowTemplates, WorkflowActions } from "@prisma/client/";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import { CalendarEvent } from "@calcom/types/Calendar";

import prisma from "@lib/prisma";
import * as twilio from "@lib/reminders/smsProviders/twilioProvider";
import smsReminderTemplate from "@lib/reminders/templates/smsReminderTemplate";

dayjs.extend(isBetween);

enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}

export const scheduleSMSReminder = async (
  evt: CalendarEvent,
  reminderPhone: string,
  triggerEvent: WorkflowTriggerEvents,
  action: WorkflowActions,
  timeBefore: {
    time: number | null;
    timeUnit: TimeUnit | null;
  },
  message: string,
  workflowStepId: number,
  template: WorkflowTemplates
) => {
  const { startTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined =
    timeBefore.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  const scheduledDate =
    timeBefore.time && timeUnit ? dayjs(startTime).subtract(timeBefore.time, timeUnit) : null;

  switch (template) {
    case WorkflowTemplates.REMINDER:
      const userName = action === WorkflowActions.SMS_ATTENDEE ? evt.attendees[0].name : "";
      const attendeeName =
        action === WorkflowActions.SMS_ATTENDEE ? evt.organizer.name : evt.attendees[0].name;

      message =
        smsReminderTemplate(evt.startTime, evt.title, evt.attendees[0].timeZone, attendeeName, userName) ||
        message;
      break;
  }
  if (message.length > 0) {
    //send SMS when event is booked/cancelled
    if (
      triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED
    ) {
      try {
        await twilio.sendSMS(reminderPhone, message);
      } catch (error) {
        console.log(`Error sending SMS with error ${error}`);
      }
    }

    if (scheduledDate) {
      if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT) {
        // Can only schedule at least 60 minutes in advance and at most 7 days in advance
        if (
          !currentDate.isBetween(scheduledDate.subtract(1, "hour"), scheduledDate) &&
          scheduledDate.isBetween(currentDate, currentDate.add(7, "day"))
        ) {
          try {
            const scheduledSMS = await twilio.scheduleSMS(reminderPhone, message, scheduledDate.toDate());

            await prisma.workflowReminder.create({
              data: {
                bookingUid: uid,
                workflowStepId: workflowStepId,
                method: "SMS",
                scheduledDate: scheduledDate.toDate(),
                scheduled: true,
                referenceId: scheduledSMS.sid,
              },
            });
          } catch (error) {
            console.log(`Error scheduling SMS with error ${error}`);
          }
        }

        // Write to DB and send to CRON if scheduled reminder date is past 7 days
        if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
          await prisma.workflowReminder.create({
            data: {
              bookingUid: uid,
              workflowStepId: workflowStepId,
              method: "SMS",
              scheduledDate: scheduledDate.toDate(),
              scheduled: false,
            },
          });
        }
      }
    }
  }
};

export const deleteScheduledSMSReminder = async (referenceId: string) => {
  try {
    await twilio.cancelSMS(referenceId);

    await prisma.workflowReminder.delete({
      where: {
        referenceId: referenceId,
      },
    });
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
