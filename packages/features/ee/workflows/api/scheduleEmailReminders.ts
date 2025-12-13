/**
 * @deprecated use smtp with tasker instead
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { SchedulingType, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import {
  getAllRemindersToCancel,
  getAllRemindersToDelete,
  getAllUnscheduledReminders,
  getWorkflowRecipientEmail,
} from "../lib/getWorkflowReminders";
import { sendOrScheduleWorkflowEmails } from "../lib/reminders/providers/emailProvider";
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

export async function handler(req: NextRequest) {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const isSendgridEnabled = !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_EMAIL);

  if (isSendgridEnabled) {
    const remindersToDelete: { referenceId: string | null; id: number }[] = await getAllRemindersToDelete();

    const reminderIds: number[] = [];
    const handlePastCancelledReminders = remindersToDelete.map(async (reminder) => {
      reminderIds.push(reminder.id);
      try {
        if (reminder.referenceId) {
          await deleteScheduledSend(reminder.referenceId);
        }
      } catch (err) {
        logger.error(`Error deleting scheduled send (ref: ${reminder.referenceId}): ${err}`);
      }
    });

    await Promise.allSettled(handlePastCancelledReminders);

    if (reminderIds.length > 0) {
      try {
        await prisma.workflowReminder.updateMany({
          where: {
            id: {
              in: reminderIds,
            },
          },
          data: { referenceId: null },
        });
      } catch (err) {
        logger.error(`Error updating reminders: ${err}`);
      }
    }

    //cancel reminders for cancelled/rescheduled bookings that are scheduled within the next hour
    const remindersToCancel: { referenceId: string | null; id: number }[] = await getAllRemindersToCancel();

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const results = await Promise.allSettled(cancelUpdatePromises);
    results.forEach((result) => {
      if (result.status === "rejected") {
        logger.error(`Error cancelling scheduled_sends: ${result.reason}`);
      }
    });
  }

  // schedule all unscheduled reminders within the next 72 hours
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendEmailPromises: Promise<any>[] = [];

  const unscheduledReminders = await getAllUnscheduledReminders();

  if (!unscheduledReminders.length) {
    return NextResponse.json({ message: "No Emails to schedule" }, { status: 200 });
  }

  for (const reminder of unscheduledReminders) {
    if (!reminder.booking) {
      continue;
    }
    const referenceUid = reminder.uuid ?? uuidv4();

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

          const recipientEmail = getWorkflowRecipientEmail({
            action: reminder.workflowStep.action || WorkflowActions.EMAIL_ADDRESS,
            attendeeEmail: reminder.booking.attendees[0].email,
            organizerEmail: reminder.booking.user?.email,
            sendToEmail: reminder.workflowStep.sendTo,
          });

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
            cancelLink: `${bookerUrl}/booking/${reminder.booking.uid}?cancel=true${
              recipientEmail ? `&cancelledBy=${encodeURIComponent(recipientEmail)}` : ""
            }`,
            rescheduleLink: `${bookerUrl}/reschedule/${reminder.booking.uid}${
              recipientEmail ? `?rescheduledBy=${encodeURIComponent(recipientEmail)}` : ""
            }`,
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
          const brandingDisabled = reminder.booking.eventType?.team
            ? !!reminder.booking.eventType?.team?.hideBranding
            : !!reminder.booking.user?.hideBranding;

          const emailSubject = customTemplate(
            reminder.workflowStep.emailSubject || "",
            variables,
            emailLocale,
            getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
            brandingDisabled
          ).text;
          emailContent.emailSubject = emailSubject;
          emailContent.emailBody = customTemplate(
            reminder.workflowStep.reminderBody || "",
            variables,
            emailLocale,
            getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
            brandingDisabled
          ).html;

          emailBodyEmpty =
            customTemplate(
              reminder.workflowStep.reminderBody || "",
              variables,
              emailLocale,
              getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat)
            ).text.length === 0;
        } else if (reminder.workflowStep.template === WorkflowTemplates.REMINDER) {
          const brandingDisabled = reminder.booking.eventType?.team
            ? !!reminder.booking.eventType?.team?.hideBranding
            : !!reminder.booking.user?.hideBranding;
          emailContent = emailReminderTemplate({
            isEditingMode: false,
            locale: reminder.booking.user?.locale || "en",
            t: await getTranslation(reminder.booking.user?.locale ?? "en", "common"),
            action: reminder.workflowStep.action,
            timeFormat: getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
            startTime: reminder.booking.startTime.toISOString() || "",
            endTime: reminder.booking.endTime.toISOString() || "",
            eventName: reminder.booking.eventType?.title || "",
            timeZone: timeZone || "",
            location: reminder.booking.location || "",
            meetingUrl: bookingMetadataSchema.parse(reminder.booking.metadata || {})?.videoCallUrl || "",
            otherPerson: attendeeName || "",
            name: name || "",
            isBrandingDisabled: brandingDisabled,
          });
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
            t: await getTranslation(reminder.booking.user?.locale ?? "en", "common"),
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
          const batchId = isSendgridEnabled ? await getBatchId() : undefined;

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
            location: bookingMetadataSchema.parse(booking.metadata || {})?.videoCallUrl || booking.location,
            title: booking.title || booking.eventType?.title || "",
          };

          const mailData = {
            subject: emailContent.emailSubject,
            to: Array.isArray(sendTo) ? sendTo : [sendTo],
            html: emailContent.emailBody,
            attachments: reminder.workflowStep.includeCalendarEvent
              ? [
                  {
                    content: generateIcsString({ event, status: "CONFIRMED" }) || "",
                    filename: "event.ics",
                    contentType: "text/calendar; charset=UTF-8; method=REQUEST",
                    disposition: "attachment",
                  },
                ]
              : undefined,
            sender: reminder.workflowStep.sender,
            ...(!reminder.booking?.eventType?.hideOrganizerEmail && {
              replyTo:
                reminder.booking?.eventType?.customReplyToEmail ??
                reminder.booking?.userPrimaryEmail ??
                reminder.booking.user?.email,
            }),
          };

          if (isSendgridEnabled) {
            sendEmailPromises.push(
              sendSendgridMail({
                ...mailData,
                batchId,
                sendAt: dayjs(reminder.scheduledDate).unix(),
              })
            );
          } else {
            sendEmailPromises.push(
              sendOrScheduleWorkflowEmails({
                ...mailData,
                referenceUid,
                sendAt: reminder.scheduledDate,
              })
            );
          }

          await prisma.workflowReminder.update({
            where: {
              id: reminder.id,
            },
            data: {
              scheduled: true,
              referenceId: batchId,
              uuid: referenceUid,
            },
          });
        }
      } catch (error) {
        logger.error(`Error scheduling Email with error ${error}`, {
          reminderId: reminder.id,
          scheduledDate: reminder.scheduledDate,
          isMandatoryReminder: reminder.isMandatoryReminder,
          workflowStepId: reminder?.workflowStep?.id,
          bookingUid: reminder.booking?.uid,
          fullError: safeStringify(error),
        });
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

        const brandingDisabled = reminder.booking.eventType?.team
          ? !!reminder.booking.eventType?.team?.hideBranding
          : !!reminder.booking.user?.hideBranding;

        emailContent = emailReminderTemplate({
          isEditingMode: false,
          locale: reminder.booking.user?.locale || "en",
          t: await getTranslation(reminder.booking.user?.locale ?? "en", "common"),
          action: WorkflowActions.EMAIL_ATTENDEE,
          timeFormat: getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
          startTime: reminder.booking.startTime.toISOString() || "",
          endTime: reminder.booking.endTime.toISOString() || "",
          eventName: reminder.booking.eventType?.title || "",
          timeZone: timeZone || "",
          location: reminder.booking.location || "",
          meetingUrl: bookingMetadataSchema.parse(reminder.booking.metadata || {})?.videoCallUrl || "",
          otherPerson: attendeeName || "",
          name: name || "",
          isBrandingDisabled: brandingDisabled,
        });
        if (emailContent.emailSubject.length > 0 && !emailBodyEmpty && sendTo) {
          const batchId = isSendgridEnabled ? await getBatchId() : undefined;

          const mailData = {
            subject: emailContent.emailSubject,
            to: [sendTo],
            html: emailContent.emailBody,
            sender: reminder.workflowStep?.sender,
            ...(!reminder.booking?.eventType?.hideOrganizerEmail && {
              replyTo:
                reminder.booking?.eventType?.customReplyToEmail ||
                reminder.booking?.userPrimaryEmail ||
                reminder.booking.user?.email,
            }),
          };
          if (isSendgridEnabled) {
            sendEmailPromises.push(
              sendSendgridMail({
                ...mailData,
                batchId,
                sendAt: dayjs(reminder.scheduledDate).unix(),
              })
            );
          } else {
            sendEmailPromises.push(
              sendOrScheduleWorkflowEmails({
                ...mailData,
                sendAt: reminder.scheduledDate,
                referenceUid,
              })
            );
          }

          await prisma.workflowReminder.update({
            where: {
              id: reminder.id,
            },
            data: {
              scheduled: true,
              referenceId: batchId,
              uuid: referenceUid,
            },
          });
        }
      } catch (error) {
        logger.error(`Error scheduling Email with error ${error}`, {
          reminderId: reminder.id,
          scheduledDate: reminder.scheduledDate,
          isMandatoryReminder: reminder.isMandatoryReminder,
          workflowStepId: reminder?.workflowStep?.id,
          bookingUid: reminder.booking?.uid,
          fullError: safeStringify(error),
        });
      }
    }
  }

  const sendResults = await Promise.allSettled(sendEmailPromises);
  sendResults.forEach((result) => {
    if (result.status === "rejected") {
      logger.error("Email sending failed", result.reason);
    }
  });

  return NextResponse.json({ message: `${unscheduledReminders.length} Emails to schedule` }, { status: 200 });
}
