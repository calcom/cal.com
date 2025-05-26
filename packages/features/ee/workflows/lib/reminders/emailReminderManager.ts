import type { EventStatus } from "ics";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { preprocessNameFieldDataWithVariant } from "@calcom/features/form-builder/utils";
import tasker from "@calcom/features/tasker";
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

import { sendOrScheduleWorkflowEmails } from "./providers/emailProvider";
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
  sendTo: string[];
  action: ScheduleEmailReminderAction;
  userId?: number | null;
  teamId?: number | null;
  emailSubject?: string;
  emailBody?: string;
  hideBranding?: boolean;
  includeCalendarEvent?: boolean;
  isMandatoryReminder?: boolean;
  verifiedAt: Date | null;
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
    verifiedAt,
    userId,
    teamId,
  } = args;

  if (!verifiedAt) {
    log.warn(`Workflow step ${workflowStepId} not yet verified`);
    return;
  }

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
      // check if first attendee of sendTo is present in the attendees list, if not take the evt attendee
      const attendeeEmailToBeUsedInMailFromEvt = evt.attendees.find(
        (attendee) => attendee.email === sendTo[0]
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
      cancelReason: evt.cancellationReason,
      rescheduleLink: `${bookerUrl}/reschedule/${evt.uid}`,
      rescheduleReason: evt.rescheduleReason,
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
    emailContent = emailReminderTemplate({
      isEditingMode: false,
      locale: evt.organizer.language.locale,
      t: await getTranslation(evt.organizer.language.locale || "en", "common"),
      action,
      timeFormat: evt.organizer.timeFormat,
      startTime,
      endTime,
      eventName: evt.title,
      timeZone,
      location: evt.location || "",
      meetingUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl || "",
      otherPerson: attendeeName,
      name,
    });
  } else if (template === WorkflowTemplates.RATING) {
    emailContent = emailRatingTemplate({
      isEditingMode: true,
      locale: evt.organizer.language.locale,
      action,
      t: await getTranslation(evt.organizer.language.locale || "en", "common"),
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

  async function prepareEmailData() {
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

    const attachments = includeCalendarEvent
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
      : undefined;

    return {
      subject: emailContent.emailSubject,
      html: emailContent.emailBody,
      ...(!evt.hideOrganizerEmail && { replyTo: evt?.eventType?.customReplyToEmail || evt.organizer.email }),
      attachments,
      sender,
    };
  }

  const mailData = await prepareEmailData();

  const isSendgridEnabled = !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_EMAIL);

  const featureRepo = new FeaturesRepository();

  const isWorkflowSmtpEmailsEnabled = teamId
    ? await featureRepo.checkIfTeamHasFeature(teamId, "workflow-smtp-emails")
    : userId
    ? await featureRepo.checkIfUserHasFeature(userId, "workflow-smtp-emails")
    : false;

  if (isWorkflowSmtpEmailsEnabled || !isSendgridEnabled) {
    let reminderUid;
    if (scheduledDate) {
      const reminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: uid,
          workflowStepId,
          method: WorkflowMethods.EMAIL,
          scheduledDate: scheduledDate.toDate(),
          scheduled: true,
        },
      });
      reminderUid = reminder.uuid;
    }

    await sendOrScheduleWorkflowEmails({
      ...mailData,
      to: sendTo,
      sendAt: scheduledDate?.toDate(),
      referenceUid: reminderUid ?? undefined,
    });

    return;
  }

  /**
   * @deprecated only needed for SendGrid, use SMTP with tasker instead
   */
  if (
    triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
    triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ||
    triggerEvent === WorkflowTriggerEvents.RESCHEDULE_EVENT
  ) {
    try {
      const promises = sendTo.map((email) => sendSendgridMail({ ...mailData, to: email }));
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
        const sendgridBatchId = await getBatchId();

        // If sendEmail failed then workflowReminer will not be created, failing E2E tests
        await sendSendgridMail({
          ...mailData,
          to: sendTo,
          sendAt: scheduledDate.unix(),
          batchId: sendgridBatchId,
        });

        if (!isMandatoryReminder) {
          await prisma.workflowReminder.create({
            data: {
              bookingUid: uid,
              workflowStepId: workflowStepId,
              method: WorkflowMethods.EMAIL,
              scheduledDate: scheduledDate.toDate(),
              scheduled: true,
              referenceId: sendgridBatchId,
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
              referenceId: sendgridBatchId,
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

export const deleteScheduledEmailReminder = async (reminderId: number) => {
  const workflowReminder = await prisma.workflowReminder.findUnique({
    where: {
      id: reminderId,
    },
  });

  if (!workflowReminder) {
    console.error("Workflow reminder not found");
    return;
  }

  const { uuid, referenceId } = workflowReminder;
  if (uuid) {
    try {
      const taskId = await tasker.cancelWithReference(uuid, "sendWorkflowEmails");
      if (taskId) {
        await prisma.workflowReminder.delete({
          where: {
            id: reminderId,
          },
        });

        return;
      }
    } catch (error) {
      log.error(`Error canceling/deleting reminder with tasker. Error: ${error}`);
    }
  }

  /**
   * @deprecated only needed for SendGrid, use SMTP with tasker instead
   */
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
