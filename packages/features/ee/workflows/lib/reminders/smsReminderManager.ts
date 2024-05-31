import dayjs from "@calcom/dayjs";
import { SENDER_ID } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { WorkflowTemplates, WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CalEventResponses, RecurringEvent } from "@calcom/types/Calendar";

import { getSenderId } from "../alphanumericSenderIdSupport";
import type { ScheduleReminderArgs } from "./emailReminderManager";
import * as twilio from "./providers/twilioProvider";
import type { VariablesType } from "./templates/customTemplate";
import customTemplate from "./templates/customTemplate";
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
  timeZone: string;
  language: { locale: string };
};

export type BookingInfo = {
  uid?: string | null;
  bookerUrl?: string;
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
  } = args;

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
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

  let smsMessage = message;

  if (smsMessage) {
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
      cancelLink: `${evt.bookerUrl}/booking/${evt.uid}?cancel=true`,
      rescheduleLink: `${evt.bookerUrl}/reschedule/${evt.uid}`,
    };
    const customMessage = customTemplate(smsMessage, variables, locale, evt.organizer.timeFormat);
    smsMessage = customMessage.text;
  } else if (template === WorkflowTemplates.REMINDER) {
    smsMessage =
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
  log.debug(`Sending sms for trigger ${triggerEvent}`, smsMessage);

  if (smsMessage.length > 0 && reminderPhone && isNumberVerified) {
    //send SMS when event is booked/cancelled/rescheduled
    if (
      triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ||
      triggerEvent === WorkflowTriggerEvents.RESCHEDULE_EVENT
    ) {
      try {
        await twilio.sendSMS(reminderPhone, smsMessage, senderID, userId, teamId);
      } catch (error) {
        log.error(`Error sending SMS with error ${error}`);
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
            smsMessage,
            scheduledDate.toDate(),
            senderID,
            userId,
            teamId
          );

          if (scheduledSMS) {
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
          }
        } catch (error) {
          log.error(`Error scheduling SMS with error ${error}`);
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
    log.error(`Error canceling reminder with error ${error}`);
  }
};
