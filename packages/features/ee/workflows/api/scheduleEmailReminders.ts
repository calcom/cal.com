/* Schedule any workflow reminder that falls within 72 hours for email */
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { SchedulingType, WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { PartialWorkflowReminder } from "../lib/getWorkflowReminders";
import {
  getAllRemindersToCancel,
  getAllRemindersToDelete,
  getAllUnscheduledReminders,
} from "../lib/getWorkflowReminders";
import {
  cancelScheduledEmail,
  deleteScheduledSend,
  getBatchId,
  sendSendgridMail,
} from "../lib/reminders/providers/sendgridProvider";
import type { VariablesType } from "../lib/reminders/templates/customTemplate";
import customTemplate from "../lib/reminders/templates/customTemplate";
import emailRatingTemplate from "../lib/reminders/templates/emailRatingTemplate";
import emailReminderTemplate from "../lib/reminders/templates/emailReminderTemplate";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    res.status(405).json({ message: "No SendGrid API key or email" });
    return;
  }

  // delete batch_ids with already past scheduled date from scheduled_sends
  const remindersToDelete: { referenceId: string | null }[] = await getAllRemindersToDelete();

  const deletePromises: Promise<any>[] = [];

  for (const reminder of remindersToDelete) {
    const deletePromise = deleteScheduledSend(reminder.referenceId);
    deletePromises.push(deletePromise);
  }

  Promise.allSettled(deletePromises).then((results) => {
    results.forEach((result) => {
      if (result.status === "rejected") {
        logger.error(`Error deleting batch id from scheduled_sends: ${result.reason}`);
      }
    });
  });

  //delete workflow reminders with past scheduled date
  await prisma.workflowReminder.deleteMany({
    where: {
      method: WorkflowMethods.EMAIL,
      scheduledDate: {
        lte: dayjs().toISOString(),
      },
    },
  });

  //cancel reminders for cancelled/rescheduled bookings that are scheduled within the next hour
  const remindersToCancel: { referenceId: string | null; id: number }[] = await getAllRemindersToCancel();

  const cancelUpdatePromises: Promise<any>[] = [];

  for (const reminder of remindersToCancel) {
    const cancelPromise = cancelScheduledEmail(reminder.referenceId);

    const updatePromise = prisma.workflowReminder.update({
      where: {
        id: reminder.id,
      },
      data: {
        scheduled: false, // to know which reminder already got cancelled (to avoid error from cancelling the same reminders again)
      },
    });

    cancelUpdatePromises.push(cancelPromise, updatePromise);
  }

  Promise.allSettled(cancelUpdatePromises).then((results) => {
    results.forEach((result) => {
      if (result.status === "rejected") {
        logger.error(`Error cancelling scheduled_sends: ${result.reason}`);
      }
    });
  });

  // schedule all unscheduled reminders within the next 72 hours
  const sendEmailPromises: Promise<any>[] = [];

  const unscheduledReminders: PartialWorkflowReminder[] = await getAllUnscheduledReminders();

  if (!unscheduledReminders.length) {
    res.status(200).json({ message: "No Emails to schedule" });
    return;
  }

  for (const reminder of unscheduledReminders) {
    if (!reminder.booking) {
      continue;
    }
    if (!reminder.isMandatoryReminder && reminder.workflowStep) {
      try {
        let sendTo;

        switch (reminder.workflowStep.action) {
          case WorkflowActions.EMAIL_HOST:
            sendTo = reminder.booking?.userPrimaryEmail ?? reminder.booking.user?.email;
            const hosts = reminder?.booking?.eventType?.hosts
              ?.filter((host) =>
                reminder.booking?.attendees.some((attendee) => attendee.email === host.user.email)
              )
              .map(({ user }) => user.destinationCalendar?.primaryEmail ?? user.email);
            const schedulingType = reminder.booking.eventType?.schedulingType;

            if (
              hosts &&
              (schedulingType === SchedulingType.COLLECTIVE || schedulingType === SchedulingType.ROUND_ROBIN)
            ) {
              sendTo = sendTo ? [sendTo, ...hosts] : hosts;
            }
            break;
          case WorkflowActions.EMAIL_ATTENDEE:
            sendTo = reminder.booking.attendees[0].email;
            break;
          case WorkflowActions.EMAIL_ADDRESS:
            sendTo = reminder.workflowStep.sendTo;
        }

        const name =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? reminder.booking.attendees[0].name
            : reminder.booking.user?.name;

        const attendeeName =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? reminder.booking.user?.name
            : reminder.booking.attendees[0].name;

        const timeZone =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? reminder.booking.attendees[0].timeZone
            : reminder.booking.user?.timeZone;

        const locale =
          reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE ||
          reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
            ? reminder.booking.attendees[0].locale
            : reminder.booking.user?.locale;

        let emailContent = {
          emailSubject: reminder.workflowStep.emailSubject || "",
          emailBody: `<body style="white-space: pre-wrap;">${
            reminder.workflowStep.reminderBody || ""
          }</body>`,
        };

        let emailBodyEmpty = false;

        if (reminder.workflowStep.reminderBody) {
          const { responses } = getCalEventResponses({
            bookingFields: reminder.booking.eventType?.bookingFields ?? null,
            booking: reminder.booking,
          });

          const organizerOrganizationProfile = await prisma.profile.findFirst({
            where: {
              userId: reminder.booking.user?.id,
            },
          });

          const organizerOrganizationId = organizerOrganizationProfile?.organizationId;

          const bookerUrl = await getBookerBaseUrl(
            reminder.booking.eventType?.team?.parentId ?? organizerOrganizationId ?? null
          );

          const variables: VariablesType = {
            eventName: reminder.booking.eventType?.title || "",
            organizerName: reminder.booking.user?.name || "",
            attendeeName: reminder.booking.attendees[0].name,
            attendeeEmail: reminder.booking.attendees[0].email,
            eventDate: dayjs(reminder.booking.startTime).tz(timeZone),
            eventEndTime: dayjs(reminder.booking?.endTime).tz(timeZone),
            timeZone: timeZone,
            location: reminder.booking.location || "",
            additionalNotes: reminder.booking.description,
            responses: responses,
            meetingUrl: bookingMetadataSchema.parse(reminder.booking.metadata || {})?.videoCallUrl,
            cancelLink: `${bookerUrl}/booking/${reminder.booking.uid}?cancel=true`,
            rescheduleLink: `${bookerUrl}/reschedule/${reminder.booking.uid}`,
            ratingUrl: `${bookerUrl}/booking/${reminder.booking.uid}?rating`,
            noShowUrl: `${bookerUrl}/booking/${reminder.booking.uid}?noShow=true`,
            attendeeTimezone: reminder.booking.attendees[0].timeZone,
            eventTimeInAttendeeTimezone: dayjs(reminder.booking.startTime).tz(
              reminder.booking.attendees[0].timeZone
            ),
            eventEndTimeInAttendeeTimezone: dayjs(reminder.booking?.endTime).tz(
              reminder.booking.attendees[0].timeZone
            ),
          };
          const emailLocale = locale || "en";
          const emailSubject = customTemplate(
            reminder.workflowStep.emailSubject || "",
            variables,
            emailLocale,
            getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
            !!reminder.booking.user?.hideBranding
          ).text;
          emailContent.emailSubject = emailSubject;
          emailContent.emailBody = customTemplate(
            reminder.workflowStep.reminderBody || "",
            variables,
            emailLocale,
            getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
            !!reminder.booking.user?.hideBranding
          ).html;

          emailBodyEmpty =
            customTemplate(
              reminder.workflowStep.reminderBody || "",
              variables,
              emailLocale,
              getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat)
            ).text.length === 0;
        } else if (reminder.workflowStep.template === WorkflowTemplates.REMINDER) {
          emailContent = emailReminderTemplate(
            false,
            reminder.booking.user?.locale || "en",
            reminder.workflowStep.action,
            getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
            reminder.booking.startTime.toISOString() || "",
            reminder.booking.endTime.toISOString() || "",
            reminder.booking.eventType?.title || "",
            timeZone || "",
            reminder.booking.location || "",
            bookingMetadataSchema.parse(reminder.booking.metadata || {})?.videoCallUrl || "",
            attendeeName || "",
            name || "",
            !!reminder.booking.user?.hideBranding
          );
        } else if (reminder.workflowStep.template === WorkflowTemplates.RATING) {
          const organizerOrganizationProfile = await prisma.profile.findFirst({
            where: {
              userId: reminder.booking.user?.id,
            },
          });

          const organizerOrganizationId = organizerOrganizationProfile?.organizationId;
          const bookerUrl = await getBookerBaseUrl(
            reminder.booking.eventType?.team?.parentId ?? organizerOrganizationId ?? null
          );
          emailContent = emailRatingTemplate({
            isEditingMode: true,
            locale: reminder.booking.user?.locale || "en",
            action: reminder.workflowStep.action || WorkflowActions.EMAIL_ADDRESS,
            timeFormat: getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
            startTime: reminder.booking.startTime.toISOString() || "",
            endTime: reminder.booking.endTime.toISOString() || "",
            eventName: reminder.booking.eventType?.title || "",
            timeZone: timeZone || "",
            organizer: reminder.booking.user?.name || "",
            name: name || "",
            ratingUrl: `${bookerUrl}/booking/${reminder.booking.uid}?rating` || "",
            noShowUrl: `${bookerUrl}/booking/${reminder.booking.uid}?noShow=true` || "",
          });
        }

        if (emailContent.emailSubject.length > 0 && !emailBodyEmpty && sendTo) {
          const batchId = await getBatchId();

          const booking = reminder.booking;

          const t = await getTranslation(booking.user?.locale ?? "en", "common");

          const attendeePromises = [];

          for (const attendee of booking.attendees) {
            attendeePromises.push(
              getTranslation(attendee.locale ?? "en", "common").then((tAttendee) => ({
                ...attendee,
                language: { locale: attendee.locale ?? "en", translate: tAttendee },
              }))
            );
          }

          const attendees = await Promise.all(attendeePromises);

          const event = {
            ...booking,
            startTime: dayjs(booking.startTime).utc().format(),
            endTime: dayjs(booking.endTime).utc().format(),
            type: booking.eventType?.slug ?? "",
            organizer: {
              name: booking.user?.name ?? "",
              email: booking.user?.email ?? "",
              timeZone: booking.user?.timeZone ?? "",
              language: { translate: t, locale: booking.user?.locale ?? "en" },
            },
            attendees,
          };

          sendEmailPromises.push(
            sendSendgridMail(
              {
                to: sendTo,
                subject: emailContent.emailSubject,
                html: emailContent.emailBody,
                batchId: batchId,
                sendAt: dayjs(reminder.scheduledDate).unix(),
                replyTo: reminder.booking?.userPrimaryEmail ?? reminder.booking.user?.email,
                attachments: reminder.workflowStep.includeCalendarEvent
                  ? [
                      {
                        content: Buffer.from(
                          generateIcsString({ event, status: "CONFIRMED" }) || ""
                        ).toString("base64"),
                        filename: "event.ics",
                        type: "text/calendar; method=REQUEST",
                        disposition: "attachment",
                        contentId: uuidv4(),
                      },
                    ]
                  : undefined,
              },
              { sender: reminder.workflowStep.sender }
            )
          );

          await prisma.workflowReminder.update({
            where: {
              id: reminder.id,
            },
            data: {
              scheduled: true,
              referenceId: batchId,
            },
          });
        }
      } catch (error) {
        logger.error(`Error scheduling Email with error ${error}`);
      }
    } else if (reminder.isMandatoryReminder) {
      try {
        const sendTo = reminder.booking.attendees[0].email;
        const name = reminder.booking.attendees[0].name;
        const attendeeName = reminder.booking.user?.name;
        const timeZone = reminder.booking.attendees[0].timeZone;

        let emailContent = {
          emailSubject: "",
          emailBody: "",
        };

        const emailBodyEmpty = false;

        emailContent = emailReminderTemplate(
          false,
          reminder.booking.user?.locale || "en",
          WorkflowActions.EMAIL_ATTENDEE,
          getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
          reminder.booking.startTime.toISOString() || "",
          reminder.booking.endTime.toISOString() || "",
          reminder.booking.eventType?.title || "",
          timeZone || "",
          reminder.booking.location || "",
          bookingMetadataSchema.parse(reminder.booking.metadata || {})?.videoCallUrl || "",
          attendeeName || "",
          name || "",
          !!reminder.booking.user?.hideBranding
        );
        if (emailContent.emailSubject.length > 0 && !emailBodyEmpty && sendTo) {
          const batchId = await getBatchId();

          sendEmailPromises.push(
            sendSendgridMail(
              {
                to: sendTo,
                subject: emailContent.emailSubject,
                html: emailContent.emailBody,
                batchId: batchId,
                sendAt: dayjs(reminder.scheduledDate).unix(),
                replyTo: reminder.booking?.userPrimaryEmail ?? reminder.booking.user?.email,
              },
              { sender: reminder.workflowStep?.sender }
            )
          );

          await prisma.workflowReminder.update({
            where: {
              id: reminder.id,
            },
            data: {
              scheduled: true,
              referenceId: batchId,
            },
          });
        }
      } catch (error) {
        logger.error(`Error scheduling Email with error ${error}`);
      }
    }
  }

  Promise.allSettled(sendEmailPromises).then((results) => {
    results.forEach((result) => {
      if (result.status === "rejected") {
        logger.error("Email sending failed", result.reason);
      }
    });
  });

  res.status(200).json({ message: `${unscheduledReminders.length} Emails to schedule` });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
