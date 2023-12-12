import client from "@sendgrid/client";
import type { MailData } from "@sendgrid/helpers/classes/mail";
import sgMail from "@sendgrid/mail";
import { createEvent } from "ics";
import type { ParticipationStatus } from "ics";
import type { DateArray } from "ics";
import { RRule } from "rrule";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { preprocessNameFieldDataWithVariant } from "@calcom/features/form-builder/utils";
import { SENDER_NAME } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import {
  WorkflowActions,
  WorkflowMethods,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { AttendeeInBookingInfo, BookingInfo, timeUnitLowerCase } from "./smsReminderManager";
import type { VariablesType } from "./templates/customTemplate";
import customTemplate from "./templates/customTemplate";
import emailReminderTemplate from "./templates/emailReminderTemplate";

let sendgridAPIKey, senderEmail: string;

const log = logger.getSubLogger({ prefix: ["[emailReminderManager]"] });
if (process.env.SENDGRID_API_KEY) {
  sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
  senderEmail = process.env.SENDGRID_EMAIL as string;

  sgMail.setApiKey(sendgridAPIKey);
  client.setApiKey(sendgridAPIKey);
}

async function getBatchId() {
  if (!process.env.SENDGRID_API_KEY) {
    console.info("No sendgrid API key provided, returning DUMMY_BATCH_ID");
    return "DUMMY_BATCH_ID";
  }
  const batchIdResponse = await client.request({
    url: "/v3/mail/batch",
    method: "POST",
  });
  return batchIdResponse[1].batch_id as string;
}

function getiCalEventAsString(evt: BookingInfo, status?: ParticipationStatus) {
  const uid = uuidv4();
  let recurrenceRule: string | undefined = undefined;
  if (evt.eventType.recurringEvent?.count) {
    recurrenceRule = new RRule(evt.eventType.recurringEvent).toString().replace("RRULE:", "");
  }

  const icsEvent = createEvent({
    uid,
    startInputType: "utc",
    start: dayjs(evt.startTime)
      .utc()
      .toArray()
      .slice(0, 6)
      .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
    duration: { minutes: dayjs(evt.endTime).diff(dayjs(evt.startTime), "minute") },
    title: evt.title,
    description: evt.additionalNotes || "",
    location: evt.location || "",
    organizer: { email: evt.organizer.email || "", name: evt.organizer.name },
    attendees: [
      {
        name: preprocessNameFieldDataWithVariant("fullName", evt.attendees[0].name) as string,
        email: evt.attendees[0].email,
        partstat: status,
        role: "REQ-PARTICIPANT",
        rsvp: true,
      },
    ],
    method: "REQUEST",
    ...{ recurrenceRule },
    status: "CONFIRMED",
  });

  if (icsEvent.error) {
    throw icsEvent.error;
  }

  return icsEvent.value;
}

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
  template: WorkflowTemplates;
  sender?: string | null;
  workflowStepId?: number;
  seatReferenceUid?: string;
}

interface scheduleEmailReminderArgs extends ScheduleReminderArgs {
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
  if (action === WorkflowActions.EMAIL_ADDRESS) return;
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

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    console.error("Sendgrid credentials are missing from the .env file");
  }

  const sandboxMode = process.env.NEXT_PUBLIC_IS_E2E ? true : false;

  let attendeeEmailToBeUsedInMail: string | null = null;
  let attendeeToBeUsedInMail: AttendeeInBookingInfo | null = null;
  let name = "";
  let attendeeName = "";
  let timeZone = "";

  switch (action) {
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
      cancelLink: `/booking/${evt.uid}?cancel=true`,
      rescheduleLink: `/${evt.organizer.username}/${evt.eventType.slug}?rescheduleUid=${evt.uid}`,
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
      action,
      evt.organizer.timeFormat,
      startTime,
      endTime,
      evt.title,
      timeZone,
      attendeeName,
      name
    );
  }

  // Allows debugging generated email content without waiting for sendgrid to send emails
  log.debug(`Sending Email for trigger ${triggerEvent}`, JSON.stringify(emailContent));

  const batchId = await getBatchId();

  function sendEmail(data: Partial<MailData>, triggerEvent?: WorkflowTriggerEvents) {
    if (!process.env.SENDGRID_API_KEY) {
      console.info("No sendgrid API key provided, skipping email");
      return Promise.resolve();
    }

    const status: ParticipationStatus =
      triggerEvent === WorkflowTriggerEvents.AFTER_EVENT
        ? "COMPLETED"
        : triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED
        ? "DECLINED"
        : "ACCEPTED";

    return sgMail.send({
      to: data.to,
      from: {
        email: senderEmail,
        name: sender || SENDER_NAME,
      },
      subject: emailContent.emailSubject,
      html: emailContent.emailBody,
      batchId,
      replyTo: evt.organizer.email,
      mailSettings: {
        sandboxMode: {
          enable: sandboxMode,
        },
      },
      attachments: includeCalendarEvent
        ? [
            {
              content: Buffer.from(getiCalEventAsString(evt, status) || "").toString("base64"),
              filename: "event.ics",
              type: "text/calendar; method=REQUEST",
              disposition: "attachment",
              contentId: uuidv4(),
            },
          ]
        : undefined,
      sendAt: data.sendAt,
    });
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
    if (
      currentDate.isBefore(scheduledDate.subtract(1, "hour")) &&
      !scheduledDate.isAfter(currentDate.add(72, "hour"))
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
    } else if (scheduledDate.isAfter(currentDate.add(72, "hour"))) {
      // Write to DB and send to CRON if scheduled reminder date is past 72 hours
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
