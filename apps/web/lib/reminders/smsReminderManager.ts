import { WorkflowTriggerEvents } from "@prisma/client/";
import { TimeUnit } from "@prisma/client/";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import { CalendarEvent } from "@calcom/types/Calendar";

import prisma from "@lib/prisma";
import * as twilio from "@lib/reminders/smsProviders/twilioProvider";
import reminderCancelledSMSTemplate from "@lib/reminders/templates/reminderCancelledSMSTemplate";
import reminderUpcomingSMSTemplate from "@lib/reminders/templates/reminderUpcomingSMSTemplate";

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
  timeBefore: {
    time: number | null;
    timeUnit: TimeUnit | null;
  },
  workflowStepId: number
) => {
  const { startTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined =
    timeBefore.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  const scheduledDate =
    timeBefore.time && timeUnit ? dayjs(startTime).subtract(timeBefore.time, timeUnit) : null;

  const smsBody =
    triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED
      ? (reminderCancelledSMSTemplate(
          evt.title,
          evt.organizer.name,
          evt.startTime,
          evt.attendees[0].timeZone
        ) as string)
      : (reminderUpcomingSMSTemplate(
          evt.title,
          evt.organizer.name,
          evt.startTime,
          evt.attendees[0].timeZone
        ) as string);

  if (smsBody.length > 0) {
    //send SMS when event is booked/cancelled
    if (
      triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED
    ) {
      try {
        await twilio.sendSMS(reminderPhone, smsBody);
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
            const scheduledSMS = await twilio.scheduleSMS(reminderPhone, smsBody, scheduledDate.toDate());

            await prisma.workflowReminder.create({
              data: {
                booking: {
                  connect: {
                    uid: uid,
                  },
                },
                workflowStep: {
                  connect: {
                    id: workflowStepId,
                  },
                },
                method: "SMS",
                sendTo: reminderPhone,
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
              booking: {
                connect: {
                  uid: uid,
                },
              },
              workflowStep: {
                connect: {
                  id: workflowStepId,
                },
              },
              method: "SMS",
              sendTo: reminderPhone,
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
