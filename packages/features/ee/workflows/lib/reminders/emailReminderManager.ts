import type { MailData } from "@sendgrid/helpers/classes/mail";
import type { EventStatus } from "ics";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { preprocessNameFieldDataWithVariant } from "@calcom/features/form-builder/utils";
import { WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import {
  WorkflowActions,
  WorkflowMethods,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import { getBatchId, sendSendgridMail } from "./providers/sendgridProvider";
import type { AttendeeInBookingInfo, BookingInfo, timeUnitLowerCase } from "./smsReminderManager";
import type { VariablesType } from "./templates/customTemplate";
import customTemplate from "./templates/customTemplate";
import emailRatingTemplate from "./templates/emailRatingTemplate";
import emailReminderTemplate from "./templates/emailReminderTemplate";

const log = logger.getSubLogger({ prefix: ["[emailReminderManager]"] });

type ScheduleEmailReminderAction = Extract<
  WorkflowActions,
  "EMAIL_HOST" | "EMAIL_ATTENDEE" | "EMAIL_ADDRESS"
>;

export interface ScheduleReminderArgs {
  evt: BookingInfo;
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  };
  template?: WorkflowTemplates;
  sender?: string | null;
  workflowStepId?: number;
  seatReferenceUid?: string;
}

interface scheduleEmailReminderArgs extends ScheduleReminderArgs {
  evt: BookingInfo;
  sendTo: MailData["to"];
  action: ScheduleEmailReminderAction;
  emailSubject?: string;
  emailBody?: string;
  hideBranding?: boolean;
  includeCalendarEvent?: boolean;
  isMandatoryReminder?: boolean;
}

export const scheduleEmailReminder = async (args: scheduleEmailReminderArgs) => {
  const {
    evt,
    triggerEvent,
    timeSpan,
    template,
    sender,
    workflowStepId,
    seatReferenceUid,
    sendTo,
    emailSubject = "",
    emailBody = "",
    hideBranding,
    includeCalendarEvent,
    isMandatoryReminder,
    action,
  } = args;
  const { startTime, endTime } = evt;
  const uid = evt.uid as string;
  const currentDate = dayjs();
  const timeUnit: timeUnitLowerCase | undefined = timeSpan.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;

  let scheduledDate = null;

  if (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(startTime).subtract(timeSpan.time, timeUnit) : null;
  } else if (triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) {
    scheduledDate = timeSpan.time && timeUnit ? dayjs(endTime).add(timeSpan.time, timeUnit) : null;
  }

  let attendeeEmailToBeUsedInMail: string | null = null;
  let attendeeToBeUsedInMail: AttendeeInBookingInfo | null = null;
  let name = "";
  let attendeeName = "";
  let timeZone = "";

  switch (action) {
    case WorkflowActions.EMAIL_ADDRESS:
      name = "";
      attendeeToBeUsedInMail = evt.attendees[0];
      attendeeName = evt.attendees[0].name;
      timeZone = evt.organizer.timeZone;
      break;
    case WorkflowActions.EMAIL_HOST:
      attendeeToBeUsedInMail = evt.attendees[0];
      name = evt.organizer.name;
      attendeeName = attendeeToBeUsedInMail.name;
      timeZone = evt.organizer.timeZone;
      break;
    case WorkflowActions.EMAIL_ATTENDEE:
      //These type checks are required as sendTo is of type MailData["to"] which in turn is of string | {name?:string, email: string} | string | {name?:string, email: string}[0]
      // and the email is being sent to the first attendee of event by default instead of the sendTo
      // so check if first attendee can be extracted from sendTo -> attendeeEmailToBeUsedInMail
      if (typeof sendTo === "string") {
        attendeeEmailToBeUsedInMail = sendTo;
      } else if (Array.isArray(sendTo)) {
        // If it's an array, take the first entry (if it exists) and extract name and email (if object); otherwise, just put the email (if string)
        const emailData = sendTo[0];
        if (typeof emailData === "object" && emailData !== null) {
          const { name, email } = emailData;
          attendeeEmailToBeUsedInMail = email;
        } else if (typeof emailData === "string") {
          attendeeEmailToBeUsedInMail = emailData;
        }
      } else if (typeof sendTo === "object" && sendTo !== null) {
        const { name, email } = sendTo;
        attendeeEmailToBeUsedInMail = email;
      }

      // check if first attendee of sendTo is present in the attendees list, if not take the evt attendee
      const attendeeEmailToBeUsedInMailFromEvt = evt.attendees.find(
        (attendee) => attendee.email === attendeeEmailToBeUsedInMail
      );
      attendeeToBeUsedInMail = attendeeEmailToBeUsedInMailFromEvt
        ? attendeeEmailToBeUsedInMailFromEvt
        : evt.attendees[0];
      name = attendeeToBeUsedInMail.name;
      attendeeName = evt.organizer.name;
      timeZone = attendeeToBeUsedInMail.timeZone;
      break;
  }

  let emailContent = {
    emailSubject,
    emailBody: `<body style="white-space: pre-wrap;">${emailBody}</body>`,
  };
  const bookerUrl = evt.bookerUrl ?? WEBSITE_URL;

  if (emailBody) {
    const variables: VariablesType = {
      eventName: evt.title || "",
      organizerName: evt.organizer.name,
      attendeeName: attendeeToBeUsedInMail.name,
      attendeeFirstName: attendeeToBeUsedInMail.firstName,
      attendeeLastName: attendeeToBeUsedInMail.lastName,
      attendeeEmail: attendeeToBeUsedInMail.email,
      eventDate: dayjs(startTime).tz(timeZone),
      eventEndTime: dayjs(endTime).tz(timeZone),
      timeZone: timeZone,
      location: evt.location,
      additionalNotes: evt.additionalNotes,
      responses: evt.responses,
      meetingUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl,
      cancelLink: `${bookerUrl}/booking/${evt.uid}?cancel=true`,
      rescheduleLink: `${bookerUrl}/reschedule/${evt.uid}`,
      ratingUrl: `${bookerUrl}/booking/${evt.uid}?rating`,
      noShowUrl: `${bookerUrl}/booking/${evt.uid}?noShow=true`,
      attendeeTimezone: evt.attendees[0].timeZone,
      eventTimeInAttendeeTimezone: dayjs(startTime).tz(evt.attendees[0].timeZone),
      eventEndTimeInAttendeeTimezone: dayjs(endTime).tz(evt.attendees[0].timeZone),
    };

    const locale =
      action === WorkflowActions.EMAIL_ATTENDEE
        ? attendeeToBeUsedInMail.language?.locale
        : evt.organizer.language.locale;

    const emailSubjectTemplate = customTemplate(emailSubject, variables, locale, evt.organizer.timeFormat);
    emailContent.emailSubject = emailSubjectTemplate.text;
    emailContent.emailBody = customTemplate(
      emailBody,
      variables,
      locale,
      evt.organizer.timeFormat,
      hideBranding
    ).html;
  } else if (template === WorkflowTemplates.REMINDER) {
    emailContent = emailReminderTemplate(
      false,
      evt.organizer.language.locale,
      action,
      evt.organizer.timeFormat,
      startTime,
      endTime,
      evt.title,
      timeZone,
      evt.location || "",
      bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl || "",
      attendeeName,
      name
    );
  } else if (template === WorkflowTemplates.RATING) {
    emailContent = emailRatingTemplate({
      isEditingMode: true,
      locale: evt.organizer.language.locale,
      action,
      timeFormat: evt.organizer.timeFormat,
      startTime,
      endTime,
      eventName: evt.title,
      timeZone,
      organizer: evt.organizer.name,
      name,
      ratingUrl: `${bookerUrl}/booking/${evt.uid}?rating`,
      noShowUrl: `${bookerUrl}/booking/${evt.uid}?noShow=true`,
    });
  }

  // Allows debugging generated email content without waiting for sendgrid to send emails
  log.debug(`Sending Email for trigger ${triggerEvent}`, JSON.stringify(emailContent));

  const batchId = await getBatchId();

  async function sendEmail(data: Partial<MailData>, triggerEvent?: WorkflowTriggerEvents) {
    const status: EventStatus =
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ? "CANCELLED" : "CONFIRMED";

    const organizerT = await getTranslation(evt.organizer.language.locale || "en", "common");

    const attendeeT = await getTranslation(evt.attendees[0].language.locale || "en", "common");

    const attendee = {
      ...evt.attendees[0],
      name: preprocessNameFieldDataWithVariant("fullName", evt.attendees[0].name) as string,
      language: { ...evt.attendees[0].language, translate: attendeeT },
    };

    const emailEvent = {
      ...evt,
      type: evt.eventType?.slug || "",
      organizer: { ...evt.organizer, language: { ...evt.organizer.language, translate: organizerT } },
      attendees: [attendee],
    };

    return sendSendgridMail(
      {
        to: data.to,
        subject: emailContent.emailSubject,
        html: emailContent.emailBody,
        batchId,
        replyTo: evt.organizer.email,
        attachments: includeCalendarEvent
          ? [
              {
                content: Buffer.from(
                  generateIcsString({
                    event: emailEvent,
                    status,
                  }) || ""
                ).toString("base64"),
                filename: "event.ics",
                type: "text/calendar; method=REQUEST",
                disposition: "attachment",
                contentId: uuidv4(),
              },
            ]
          : undefined,
        sendAt: data.sendAt,
      },
      { sender }
    );
  }

  if (
    triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
    triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ||
    triggerEvent === WorkflowTriggerEvents.RESCHEDULE_EVENT
  ) {
    try {
      if (!sendTo) throw new Error("No email addresses provided");
      const addressees = Array.isArray(sendTo) ? sendTo : [sendTo];
      const promises = addressees.map((email) => sendEmail({ to: email }, triggerEvent));
      // TODO: Maybe don't await for this?
      await Promise.all(promises);
    } catch (error) {
      log.error("Error sending Email");
    }
  } else if (
    (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT ||
      triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) &&
    scheduledDate
  ) {
    // Sendgrid to schedule emails
    // Can only schedule at least 60 minutes and at most 72 hours in advance
    // To limit the amount of canceled sends we schedule at most 2 hours in advance
    if (
      currentDate.isBefore(scheduledDate.subtract(1, "hour")) &&
      !scheduledDate.isAfter(currentDate.add(2, "hour"))
    ) {
      try {
        // If sendEmail failed then workflowReminer will not be created, failing E2E tests
        await sendEmail(
          {
            to: sendTo,
            sendAt: scheduledDate.unix(),
          },
          triggerEvent
        );
        if (!isMandatoryReminder) {
          await prisma.workflowReminder.create({
            data: {
              bookingUid: uid,
              workflowStepId: workflowStepId,
              method: WorkflowMethods.EMAIL,
              scheduledDate: scheduledDate.toDate(),
              scheduled: true,
              referenceId: batchId,
              seatReferenceId: seatReferenceUid,
            },
          });
        } else {
          await prisma.workflowReminder.create({
            data: {
              bookingUid: uid,
              method: WorkflowMethods.EMAIL,
              scheduledDate: scheduledDate.toDate(),
              scheduled: true,
              referenceId: batchId,
              seatReferenceId: seatReferenceUid,
              isMandatoryReminder: true,
            },
          });
        }
      } catch (error) {
        log.error(`Error scheduling email with error ${error}`);
      }
    } else if (scheduledDate.isAfter(currentDate.add(2, "hour"))) {
      // Write to DB and send to CRON if scheduled reminder date is past 2 hours
      if (!isMandatoryReminder) {
        await prisma.workflowReminder.create({
          data: {
            bookingUid: uid,
            workflowStepId: workflowStepId,
            method: WorkflowMethods.EMAIL,
            scheduledDate: scheduledDate.toDate(),
            scheduled: false,
            seatReferenceId: seatReferenceUid,
          },
        });
      } else {
        await prisma.workflowReminder.create({
          data: {
            bookingUid: uid,
            method: WorkflowMethods.EMAIL,
            scheduledDate: scheduledDate.toDate(),
            scheduled: false,
            seatReferenceId: seatReferenceUid,
            isMandatoryReminder: true,
          },
        });
      }
    }
  }
};

export const deleteScheduledEmailReminder = async (reminderId: number, referenceId: string | null) => {
  try {
    if (!referenceId) {
      await prisma.workflowReminder.delete({
        where: {
          id: reminderId,
        },
      });

      return;
    }

    await prisma.workflowReminder.update({
      where: {
        id: reminderId,
      },
      data: {
        cancelled: true,
      },
    });
  } catch (error) {
    log.error(`Error canceling reminder with error ${error}`);
  }
};
