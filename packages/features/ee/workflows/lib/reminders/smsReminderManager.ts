import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WorkflowTemplates, WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CalEventResponses, RecurringEvent } from "@calcom/types/Calendar";

import { getSenderId } from "../alphanumericSenderIdSupport";
import * as twilio from "./smsProviders/twilioProvider";
import type { VariablesType } from "./templates/customTemplate";
import customTemplate from "./templates/customTemplate";
import smsReminderTemplate from "./templates/smsReminderTemplate";

export enum timeUnitLowerCase {
  DAY = "day",
  MINUTE = "minute",
  YEAR = "year",
}
const log = logger.getChildLogger({ prefix: ["[smsReminderManager]"] });

export type AttendeeInBookingInfo = {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  timeZone: string;
  language: { locale: string };
};

export type BookingInfo = {
  uid?: string | null;
  attendees: AttendeeInBookingInfo[];
  organizer: {
    language: { locale: string };
    name: string;
    email: string;
    timeZone: string;
    timeFormat?: TimeFormat;
    username?: string;
  };
  eventType: {
    slug?: string;
    recurringEvent?: RecurringEvent | null;
  };
  startTime: string;
  endTime: string;
  title: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  metadata?: Prisma.JsonValue;
};

type ScheduleSMSReminderAction = Extract<WorkflowActions, "SMS_ATTENDEE" | "SMS_NUMBER">;

export const scheduleSMSReminder = async (
  evt: BookingInfo,
  reminderPhone: string | null,
  triggerEvent: WorkflowTriggerEvents,
  action: ScheduleSMSReminderAction,
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  },
  message: string,
  workflowStepId: number,
  template: WorkflowTemplates,
  sender: string,
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

  const senderID = getSenderId(reminderPhone, sender);

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

  let attendeeToBeUsedInSMS: AttendeeInBookingInfo | null = null;
  if (action === WorkflowActions.SMS_ATTENDEE) {
    const attendeeWithReminderPhoneAsSMSReminderNumber =
      reminderPhone && evt.attendees.find((attendee) => attendee.email === evt.responses?.email?.value);
    attendeeToBeUsedInSMS = attendeeWithReminderPhoneAsSMSReminderNumber
      ? attendeeWithReminderPhoneAsSMSReminderNumber
      : evt.attendees[0];
  } else {
    attendeeToBeUsedInSMS = evt.attendees[0];
  }

  if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(startTime).subtract(timeSpan.time, timeUnit) : null;
  } else if (triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(endTime).add(timeSpan.time, timeUnit) : null;
  }

  const name = action === WorkflowActions.SMS_ATTENDEE ? attendeeToBeUsedInSMS.name : "";
  const attendeeName =
    action === WorkflowActions.SMS_ATTENDEE ? evt.organizer.name : attendeeToBeUsedInSMS.name;
  const timeZone =
    action === WorkflowActions.SMS_ATTENDEE ? attendeeToBeUsedInSMS.timeZone : evt.organizer.timeZone;

  const locale =
    action === WorkflowActions.SMS_ATTENDEE
      ? attendeeToBeUsedInSMS.language?.locale
      : evt.organizer.language.locale;

  if (message) {
    const variables: VariablesType = {
      eventName: evt.title,
      organizerName: evt.organizer.name,
      attendeeName: attendeeToBeUsedInSMS.name,
      attendeeFirstName: attendeeToBeUsedInSMS.firstName,
      attendeeLastName: attendeeToBeUsedInSMS.lastName,
      attendeeEmail: attendeeToBeUsedInSMS.email,
      eventDate: dayjs(evt.startTime).tz(timeZone),
      eventEndTime: dayjs(evt.endTime).tz(timeZone),
      timeZone: timeZone,
      location: evt.location,
      additionalNotes: evt.additionalNotes,
      responses: evt.responses,
      meetingUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl,
      cancelLink: `/booking/${evt.uid}?cancel=true`,
      rescheduleLink: `/${evt.organizer.username}/${evt.eventType.slug}?rescheduleUid=${evt.uid}`,
    };
    const customMessage = customTemplate(message, variables, locale, evt.organizer.timeFormat);
    message = customMessage.text;
  } else if (template === WorkflowTemplates.REMINDER) {
    message =
      smsReminderTemplate(
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

  // Allows debugging generated email content without waiting for sendgrid to send emails
  log.debug(`Sending sms for trigger ${triggerEvent}`, message);

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
              seatReferenceId: seatReferenceUid,
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
            seatReferenceId: seatReferenceUid,
          },
        });
      }
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
    console.log(`Error canceling reminder with error ${error}`);
  }
};
