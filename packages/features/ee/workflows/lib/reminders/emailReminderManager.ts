import type { EventStatus } from "ics";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import { preprocessNameFieldDataWithVariant } from "@calcom/features/form-builder/utils";
import tasker from "@calcom/features/tasker";
import { WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import {
  WorkflowActions,
  WorkflowMethods,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import { getWorkflowRecipientEmail } from "../getWorkflowReminders";
import { sendOrScheduleWorkflowEmails } from "./providers/emailProvider";
import type { FormSubmissionData, WorkflowContextData } from "./reminderScheduler";
import type { AttendeeInBookingInfo, BookingInfo } from "./smsReminderManager";
import type { VariablesType } from "./templates/customTemplate";
import customTemplate, {
  transformBookingResponsesToVariableFormat,
  transformRoutingFormResponsesToVariableFormat,
} from "./templates/customTemplate";
import emailRatingTemplate from "./templates/emailRatingTemplate";
import emailReminderTemplate from "./templates/emailReminderTemplate";

const log = logger.getSubLogger({ prefix: ["[emailReminderManager]"] });

export type ScheduleReminderArgs = {
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  };
  template?: WorkflowTemplates;
  sender?: string | null;
  workflowStepId?: number;
  seatReferenceUid?: string;
} & WorkflowContextData;

type scheduleEmailReminderArgs = ScheduleReminderArgs & {
  sendTo: string[];
  action: ScheduleEmailReminderAction;
  emailSubject?: string;
  emailBody?: string;
  hideBranding?: boolean;
  includeCalendarEvent?: boolean;
  verifiedAt: Date | null;
};

type SendEmailReminderParams = {
  mailData: {
    subject: string;
    html: string;
    replyTo?: string;
    attachments?: {
      content: string;
      filename: string;
      contentType: string;
      disposition: string;
    }[];
    sender?: string | null;
  };
  sendTo: string[];
  triggerEvent: WorkflowTriggerEvents;
  scheduledDate?: Date | null;
  uid?: string;
  workflowStepId?: number;
  seatReferenceUid?: string;
};

const sendOrScheduleWorkflowEmailWithReminder = async (params: SendEmailReminderParams) => {
  const { mailData, sendTo, scheduledDate, uid, workflowStepId } = params;

  let reminderUid = undefined;
  if (scheduledDate) {
    const reminder = await prisma.workflowReminder.create({
      data: {
        bookingUid: uid,
        workflowStepId,
        method: WorkflowMethods.EMAIL,
        scheduledDate,
        scheduled: true,
      },
    });
    reminderUid = reminder.uuid;
  }

  await sendOrScheduleWorkflowEmails({
    ...mailData,
    to: sendTo,
    sendAt: scheduledDate,
    referenceUid: reminderUid ?? undefined,
  });
};

export const scheduleEmailReminder = async (args: scheduleEmailReminderArgs) => {
  const { verifiedAt, workflowStepId } = args;
  if (!verifiedAt) {
    log.warn(`Workflow step ${workflowStepId} not yet verified`);
    return;
  }

  if (args.evt) {
    await scheduleEmailReminderForEvt(args);
  } else {
    await scheduleEmailReminderForForm(args);
  }
};

const scheduleEmailReminderForEvt = async (args: scheduleEmailReminderArgs & { evt: BookingInfo }) => {
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
    action,
  } = args;

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;

  const scheduledDate = WorkflowService.processWorkflowScheduledDate({
    workflowTriggerEvent: triggerEvent,
    time: timeSpan.time,
    timeUnit: timeSpan.timeUnit,
    evt,
  });

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
    case WorkflowActions.EMAIL_ATTENDEE: {
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
  }

  let emailContent = {
    emailSubject,
    emailBody: `<body style="white-space: pre-wrap;">${emailBody}</body>`,
  };
  const bookerUrl = evt.bookerUrl ?? WEBSITE_URL;

  if (emailBody) {
    const isEmailAttendeeAction = action === WorkflowActions.EMAIL_ATTENDEE;
    const recipientEmail = getWorkflowRecipientEmail({
      action,
      attendeeEmail: attendeeToBeUsedInMail.email,
      organizerEmail: evt.organizer.email,
      sendToEmail: sendTo[0],
    });
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
      responses: transformBookingResponsesToVariableFormat(evt.responses),
      meetingUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl,
      cancelLink: `${bookerUrl}/booking/${evt.uid}?cancel=true${
        recipientEmail ? `&cancelledBy=${encodeURIComponent(recipientEmail)}` : ""
      }${isEmailAttendeeAction && seatReferenceUid ? `&seatReferenceUid=${seatReferenceUid}` : ""}`,
      cancelReason: evt.cancellationReason,
      rescheduleLink: `${bookerUrl}/reschedule/${evt.uid}${
        recipientEmail
          ? `?rescheduledBy=${encodeURIComponent(recipientEmail)}${
              isEmailAttendeeAction && seatReferenceUid
                ? `&seatReferenceUid=${encodeURIComponent(seatReferenceUid)}`
                : ""
            }`
          : isEmailAttendeeAction && seatReferenceUid
          ? `?seatReferenceUid=${encodeURIComponent(seatReferenceUid)}`
          : ""
      }`,

      rescheduleReason: evt.rescheduleReason,
      ratingUrl: `${bookerUrl}/booking/${evt.uid}?rating`,
      noShowUrl: `${bookerUrl}/booking/${evt.uid}?noShow=true`,
      attendeeTimezone: evt.attendees[0].timeZone,
      eventTimeInAttendeeTimezone: dayjs(startTime).tz(evt.attendees[0].timeZone),
      eventEndTimeInAttendeeTimezone: dayjs(endTime).tz(evt.attendees[0].timeZone),
    };

    const locale = isEmailAttendeeAction
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
      location: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl || evt.location,
    };

    const attachments = includeCalendarEvent
      ? [
          {
            content:
              generateIcsString({
                event: emailEvent,
                status,
              }) || "",
            filename: "event.ics",
            contentType: "text/calendar; charset=UTF-8; method=REQUEST",
            disposition: "attachment",
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

  await sendOrScheduleWorkflowEmailWithReminder({
    mailData,
    sendTo,
    triggerEvent,
    scheduledDate,
    uid,
    workflowStepId,
    seatReferenceUid,
  });
};

// sends all immediately, no scheduling needed
const scheduleEmailReminderForForm = async (
  args: scheduleEmailReminderArgs & {
    formData: FormSubmissionData;
  }
) => {
  const {
    formData,
    triggerEvent,
    sender,
    workflowStepId,
    sendTo,
    emailSubject = "",
    emailBody = "",
    hideBranding,
  } = args;

  const emailContent = {
    emailSubject,
    emailBody: `<body style="white-space: pre-wrap;">${emailBody}</body>`,
  };

  if (emailBody) {
    const timeFormat = getTimeFormatStringFromUserTimeFormat(formData.user.timeFormat);

    const variables: VariablesType = {
      responses: transformRoutingFormResponsesToVariableFormat(formData.responses),
    };

    const emailSubjectTemplate = customTemplate(emailSubject, variables, formData.user.locale, timeFormat);
    emailContent.emailSubject = emailSubjectTemplate.text;
    emailContent.emailBody = customTemplate(
      emailBody,
      variables,
      formData.user.locale,
      timeFormat,
      hideBranding
    ).html;
  }

  // Allows debugging generated email content without waiting for sendgrid to send emails
  log.debug(`Sending Email for trigger ${triggerEvent}`, JSON.stringify(emailContent));

  const mailData = {
    subject: emailContent.emailSubject,
    html: emailContent.emailBody,
    sender,
  };

  await sendOrScheduleWorkflowEmailWithReminder({
    mailData,
    sendTo,
    triggerEvent,
    workflowStepId,
    scheduledDate: null,
  });
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
