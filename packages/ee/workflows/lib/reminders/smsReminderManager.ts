import {
  WorkflowTriggerEvents,
  TimeUnit,
  WorkflowTemplates,
  WorkflowActions,
  WorkflowMethods,
} from "@prisma/client";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

import * as twilio from "./smsProviders/twilioProvider";
import smsReminderTemplate from "./templates/smsReminderTemplate";

export enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}

export type BookingInfo = {
  uid?: string | null;
  attendees: { name: string; email: string; timeZone: string }[];
  organizer: { name: string; email: string; timeZone: string };
  startTime: string;
  title: string;
};

export const scheduleSMSReminder = async (
  evt: BookingInfo,
  reminderPhone: string | null,
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

  const name = action === WorkflowActions.SMS_ATTENDEE ? evt.attendees[0].name : "";
  const attendeeName = action === WorkflowActions.SMS_ATTENDEE ? evt.organizer.name : evt.attendees[0].name;
  const timeZone =
    action === WorkflowActions.SMS_ATTENDEE ? evt.attendees[0].timeZone : evt.organizer.timeZone;

  switch (template) {
    case WorkflowTemplates.REMINDER:
      message = smsReminderTemplate(evt.startTime, evt.title, timeZone, attendeeName, name) || message;
      break;
  }

  if (message.length > 0 && reminderPhone) {
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
    } else if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT && scheduledDate) {
      // Can only schedule at least 60 minutes in advance and at most 7 days in advance
      if (
        currentDate.isBefore(scheduledDate.subtract(1, "hour")) &&
        !scheduledDate.isAfter(currentDate.add(7, "day"))
      ) {
        try {
          const scheduledSMS = await twilio.scheduleSMS(reminderPhone, message, scheduledDate.toDate());

          await prisma.workflowReminder.create({
            data: {
              bookingUid: uid,
              workflowStepId: workflowStepId,
              method: WorkflowMethods.SMS,
              scheduledDate: scheduledDate.toDate(),
              scheduled: true,
              referenceId: scheduledSMS.sid,
            },
          });
        } catch (error) {
          console.log(`Error scheduling SMS with error ${error}`);
        }
      } else if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
        // Write to DB and send to CRON if scheduled reminder date is past 7 days
        await prisma.workflowReminder.create({
          data: {
            bookingUid: uid,
            workflowStepId: workflowStepId,
            method: WorkflowMethods.SMS,
            scheduledDate: scheduledDate.toDate(),
            scheduled: false,
          },
        });
      }
    }
  }
};

export const deleteScheduledSMSReminder = async (referenceId: string) => {
  try {
    await twilio.cancelSMS(referenceId);
  } catch (error) {
    console.log(`Error canceling reminder with error ${error}`);
  }
};
