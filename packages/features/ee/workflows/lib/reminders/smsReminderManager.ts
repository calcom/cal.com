import {
  WorkflowTriggerEvents,
  TimeUnit,
  WorkflowTemplates,
  WorkflowActions,
  WorkflowMethods,
} from "@prisma/client";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import { getSenderId } from "../alphanumericSenderIdSupport";
import * as twilio from "./smsProviders/twilioProvider";
import customTemplate, { VariablesType } from "./templates/customTemplate";
import smsReminderTemplate from "./templates/smsReminderTemplate";

export enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}

export type BookingInfo = {
  uid?: string | null;
  attendees: { name: string; email: string; timeZone: string; language: { locale: string } }[];
  organizer: {
    language: { locale: string };
    name: string;
    email: string;
    timeZone: string;
  };
  startTime: string;
  endTime: string;
  title: string;
  location?: string | null;
  additionalNotes?: string | null;
  customInputs?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
};

export const scheduleSMSReminder = async (
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
  sender: string,
  userId: number,
  isVerificationPending = false
) => {
  const { startTime, endTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined = timeSpan.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  let scheduledDate = null;

  const senderID = getSenderId(reminderPhone, sender);

  //SMS_ATTENDEE action does not need to be verified
  //isVerificationPending is from all already existing workflows (once they edit their workflow, they will also have to verify the number)
  async function getIsNumberVerified() {
    if (action === WorkflowActions.SMS_ATTENDEE) return true;
    const verifiedNumber = await prisma.verifiedNumber.findFirst({
      where: { userId, phoneNumber: reminderPhone || "" },
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

  const name = action === WorkflowActions.SMS_ATTENDEE ? evt.attendees[0].name : "";
  const attendeeName = action === WorkflowActions.SMS_ATTENDEE ? evt.organizer.name : evt.attendees[0].name;
  const timeZone =
    action === WorkflowActions.SMS_ATTENDEE ? evt.attendees[0].timeZone : evt.organizer.timeZone;

  const locale =
    action === WorkflowActions.EMAIL_ATTENDEE || action === WorkflowActions.SMS_ATTENDEE
      ? evt.attendees[0].language?.locale
      : evt.organizer.language.locale;

  switch (template) {
    case WorkflowTemplates.REMINDER:
      message = smsReminderTemplate(evt.startTime, evt.title, timeZone, attendeeName, name) || message;
      break;
    case WorkflowTemplates.CUSTOM:
      const variables: VariablesType = {
        eventName: evt.title,
        organizerName: evt.organizer.name,
        attendeeName: evt.attendees[0].name,
        attendeeEmail: evt.attendees[0].email,
        eventDate: dayjs(evt.startTime).tz(timeZone),
        eventTime: dayjs(evt.startTime).tz(timeZone),
        timeZone: timeZone,
        location: evt.location,
        additionalNotes: evt.additionalNotes,
        customInputs: evt.customInputs,
        meetingUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl,
      };
      const customMessage = await customTemplate(message, variables, locale);
      message = customMessage.text;
      break;
  }

  if (message.length > 0 && reminderPhone && isNumberVerified) {
    //send SMS when event is booked/cancelled/rescheduled
    if (
      triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ||
      triggerEvent === WorkflowTriggerEvents.RESCHEDULE_EVENT
    ) {
      try {
        await twilio.sendSMS(reminderPhone, message, senderID);
      } catch (error) {
        console.log(`Error sending SMS with error ${error}`);
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
          const scheduledSMS = await twilio.scheduleSMS(
            reminderPhone,
            message,
            scheduledDate.toDate(),
            senderID
          );

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
