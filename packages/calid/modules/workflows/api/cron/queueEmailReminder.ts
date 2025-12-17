import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { v4 as generateUuid } from "uuid";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { SchedulingType, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { PartialCalIdWorkflowReminder } from "../../config/types";
import { cancelScheduledEmail, getBatchId, sendSendgridMail } from "../../providers/sendgrid";
import type { VariablesType } from "../../templates/customTemplate";
import customTemplate from "../../templates/customTemplate";
import emailRatingTemplate from "../../templates/email/ratingTemplate";
import emailReminderTemplate from "../../templates/email/reminder";
import emailThankYouTemplate from "../../templates/email/thankYouTemplate";
import { getAllRemindersToCancel, getAllUnscheduledReminders } from "../../utils/getWorkflows";

// const removePastNotifications = async (): Promise<void> => {
//   await prisma.calIdWorkflowReminder.deleteMany({
//     where: {
//       method: WorkflowMethods.EMAIL,
//       scheduledDate: {
//         lte: dayjs().toISOString(),
//       },
//       scheduled: false,
//       OR: [{ cancelled: null }, { cancelled: false }],
//     },
//   });
// };

const processCancelledNotifications = async (): Promise<void> => {
  const notificationsToCancel: { referenceId: string | null; id: number }[] = await getAllRemindersToCancel();

  const cancellationOperations: Promise<any>[] = [];

  notificationsToCancel.forEach((notification) => {
    const emailCancellation = cancelScheduledEmail(notification.referenceId);

    const databaseUpdate = prisma.calIdWorkflowReminder.update({
      where: {
        id: notification.id,
      },
      data: {
        scheduled: false,
      },
    });

    cancellationOperations.push(emailCancellation, databaseUpdate);
  });

  Promise.allSettled(cancellationOperations).then((outcomes) => {
    outcomes.forEach((outcome) => {
      if (outcome.status === "rejected") {
        logger.error(`Failed to cancel scheduled_sends: ${outcome.reason}`);
      }
    });
  });
};

const processNotificationScheduling = async (): Promise<PartialCalIdWorkflowReminder[]> => {
  const mailDeliveryTasks: Promise<any>[] = [];

  const pendingNotifications: PartialCalIdWorkflowReminder[] = await getAllUnscheduledReminders();

  pendingNotifications.forEach(async (notification) => {
    if (!notification.booking) {
      return;
    }

    if (!notification.isMandatoryReminder && notification.workflowStep) {
      try {
        let recipientAddress;

        const actionType = notification.workflowStep.action;
        switch (actionType) {
          case WorkflowActions.EMAIL_HOST:
            recipientAddress = notification.booking?.userPrimaryEmail ?? notification.booking.user?.email;
            const hostUsers = notification?.booking?.eventType?.hosts
              ?.filter((host) =>
                notification.booking?.attendees.some((attendee) => attendee.email === host.user.email)
              )
              .map(({ user }) => user.destinationCalendar?.primaryEmail ?? user.email);
            const eventSchedulingType = notification.booking.eventType?.schedulingType;

            if (
              hostUsers &&
              (eventSchedulingType === SchedulingType.COLLECTIVE ||
                eventSchedulingType === SchedulingType.ROUND_ROBIN)
            ) {
              recipientAddress = recipientAddress ? [recipientAddress, ...hostUsers] : hostUsers;
            }
            break;
          case WorkflowActions.EMAIL_ATTENDEE:
            // recipientAddress = notification.attendee
            //   ? notification.attendee.email
            //   : notification.booking.attendees[0].email;
            recipientAddress = notification.booking.attendees[0].email;
            break;
          case WorkflowActions.EMAIL_ADDRESS:
            recipientAddress = notification.workflowStep.sendTo;
        }

        // const recipientName =
        //   notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
        //     ? notification.attendee
        //       ? notification.attendee.name
        //       : notification.booking.attendees[0].name
        //     : notification.booking.user?.name;
        const recipientName =
          notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? notification.booking.attendees[0].name
            : notification.booking.user?.name;

        // const participantName =
        //   notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
        //     ? notification.booking.user?.name
        //     : notification.attendee
        //     ? notification.attendee.name
        //     : notification.booking.attendees[0].name;
        const participantName =
          notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? notification.booking.user?.name
            : notification.booking.attendees[0].name;

        // const userTimeZone =
        //   notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
        //     ? notification.attendee
        //       ? notification.attendee.timeZone
        //       : notification.booking.attendees[0].timeZone
        //     : notification.booking.user?.timeZone;
        const userTimeZone =
          notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE
            ? notification.booking.attendees[0].timeZone
            : notification.booking.user?.timeZone;

        // const userLocale =
        //   notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE ||
        //   notification.workflowStep.action === WorkflowActions.SMS_ATTENDEE
        //     ? notification.attendee
        //       ? notification.attendee.locale
        //       : notification.booking.attendees[0].locale
        //     : notification.booking.user?.locale;

        const userLocale =
          notification.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE ||
          notification.workflowStep.action === WorkflowActions.SMS_ATTENDEE
            ? notification.booking.attendees[0].locale
            : notification.booking.user?.locale;

        let messageContent = {
          emailSubject: notification.workflowStep.emailSubject || "",
          emailBody: `<body style="white-space: pre-wrap;">${
            notification.workflowStep.reminderBody || ""
          }</body>`,
        };

        let isBodyEmpty = false;

        if (notification.workflowStep.reminderBody) {
          const { responses } = getCalEventResponses({
            bookingFields: notification.booking.eventType?.bookingFields ?? null,
            booking: notification.booking,
          });

          const organizerProfile = await prisma.profile.findFirst({
            where: {
              userId: notification.booking.user?.id,
            },
          });

          const organizerOrgId = organizerProfile?.organizationId;

          const bookingUrl = await getBookerBaseUrl(
            notification.booking.eventType?.team?.parentId ?? organizerOrgId ?? null
          );

          const templateVariables: VariablesType = {
            eventName: notification.booking.eventType?.title || "",
            organizerName: notification.booking.user?.name || "",
            // attendeeName: notification.attendee
            //   ? notification.attendee.name
            //   : notification.booking.attendees[0].name,
            attendeeName: notification.booking.attendees[0].name,
            // attendeeEmail: notification.attendee
            //   ? notification.attendee.email
            //   : notification.booking.attendees[0].email,
            attendeeEmail: notification.booking.attendees[0].email,
            eventDate: dayjs(notification.booking.startTime).tz(userTimeZone),
            eventEndTime: dayjs(notification.booking?.endTime).tz(userTimeZone),
            timezone: userTimeZone,
            location: notification.booking.location || "",
            additionalNotes: notification.booking.description,
            responses: responses,
            meetingUrl: bookingMetadataSchema.parse(notification.booking.metadata || {})?.videoCallUrl,
            cancelUrl: `${bookingUrl}/booking/${notification.booking.uid}?cancel=true`,
            rescheduleUrl: `${bookingUrl}/reschedule/${notification.booking.uid}`,
            ratingUrl: `${bookingUrl}/booking/${notification.booking.uid}?rating`,
            noShowUrl: `${bookingUrl}/booking/${notification.booking.uid}?noShow=true`,
          };
          const messageLocale = userLocale || "en";
          const processedSubject = customTemplate(
            notification.workflowStep.emailSubject || "",
            templateVariables,
            messageLocale,
            getTimeFormatStringFromUserTimeFormat(notification.booking.user?.timeFormat),
            !!notification.booking.user?.hideBranding
          ).text;
          messageContent.emailSubject = processedSubject;
          messageContent.emailBody = customTemplate(
            notification.workflowStep.reminderBody || "",
            templateVariables,
            messageLocale,
            getTimeFormatStringFromUserTimeFormat(notification.booking.user?.timeFormat),
            !!notification.booking.user?.hideBranding
          ).html;

          isBodyEmpty =
            customTemplate(
              notification.workflowStep.reminderBody || "",
              templateVariables,
              messageLocale,
              getTimeFormatStringFromUserTimeFormat(notification.booking.user?.timeFormat)
            ).text.length === 0;
        } else if (notification.workflowStep.template === WorkflowTemplates.REMINDER) {
          messageContent = emailReminderTemplate({
            isEditingMode: false,
            locale: notification.booking.user?.locale || "en",
            action: notification.workflowStep.action,
            timeFormat: getTimeFormatStringFromUserTimeFormat(notification.booking.user?.timeFormat),
            startTime: notification.booking.startTime.toISOString() || "",
            endTime: notification.booking.endTime.toISOString() || "",
            eventName: notification.booking.eventType?.title || "",
            timeZone: userTimeZone || "",
            location: notification.booking.location || "",
            meetingUrl: bookingMetadataSchema.parse(notification.booking.metadata || {})?.videoCallUrl || "",
            otherPerson: participantName || "",
            name: recipientName || "",
            isBrandingDisabled: !!notification.booking.user?.hideBranding,
          });
        } else if (notification.workflowStep.template === WorkflowTemplates.RATING) {
          const organizerProfile = await prisma.profile.findFirst({
            where: {
              userId: notification.booking.user?.id,
            },
          });

          const organizerOrgId = organizerProfile?.organizationId;
          const bookingUrl = await getBookerBaseUrl(
            notification.booking.eventType?.team?.parentId ?? organizerOrgId ?? null
          );
          messageContent = emailRatingTemplate({
            isEditingMode: true,
            locale: notification.booking.user?.locale || "en",
            action: notification.workflowStep.action || WorkflowActions.EMAIL_ADDRESS,
            timeFormat: getTimeFormatStringFromUserTimeFormat(notification.booking.user?.timeFormat),
            startTime: notification.booking.startTime.toISOString() || "",
            endTime: notification.booking.endTime.toISOString() || "",
            eventName: notification.booking.eventType?.title || "",
            timeZone: userTimeZone || "",
            organizer: notification.booking.user?.name || "",
            name: recipientName || "",
            ratingUrl: `${bookingUrl}/booking/${notification.booking.uid}?rating` || "",
            noShowUrl: `${bookingUrl}/booking/${notification.booking.uid}?noShow=true` || "",
          });
        } else if (notification.workflowStep.template === WorkflowTemplates.THANKYOU) {
          messageContent = emailThankYouTemplate({
            isEditingMode: false,
            timeFormat: getTimeFormatStringFromUserTimeFormat(notification.booking.user?.timeFormat),
            startTime: notification.booking.startTime.toISOString() || "",
            endTime: notification.booking.endTime.toISOString() || "",
            eventName: notification.booking.eventType?.title || "",
            timeZone: userTimeZone,
            otherPerson: notification.booking.user?.name || "",
            name: recipientName || "",
          });
        }
        if (messageContent.emailSubject.length > 0 && !isBodyEmpty && recipientAddress) {
          const batchIdentifier = await getBatchId();
          const bookingData = notification.booking;
          const translator = await getTranslation(bookingData.user?.locale ?? "en", "common");
          const attendeeTranslationTasks: Promise<
            (typeof bookingData.attendees)[number] & {
              language: { locale: string; translate: Awaited<ReturnType<typeof getTranslation>> };
            }
          >[] = [];

          bookingData.attendees.forEach((attendee) => {
            attendeeTranslationTasks.push(
              getTranslation(attendee.locale ?? "en", "common").then((attendeeTranslator) => ({
                ...attendee,
                language: { locale: attendee.locale ?? "en", translate: attendeeTranslator },
              }))
            );
          });

          const translatedAttendees = await Promise.all(attendeeTranslationTasks);
          const eventData = {
            ...bookingData,
            startTime: dayjs(bookingData.startTime).utc().format(),
            endTime: dayjs(bookingData.endTime).utc().format(),
            type: bookingData.eventType?.slug ?? "",
            organizer: {
              name: bookingData.user?.name ?? "",
              email: bookingData.user?.email ?? "",
              timeZone: bookingData.user?.timeZone ?? "",
              language: { translate: translator, locale: bookingData.user?.locale ?? "en" },
            },
            attendees: translatedAttendees,
          };
          const isMultipleRecipients = Array.isArray(recipientAddress);
          const isOrganizerRecipient = isMultipleRecipients
            ? recipientAddress[0] === bookingData.user?.email
            : recipientAddress === bookingData.user?.email;

          const responseAddress = isOrganizerRecipient
            ? bookingData.attendees[0].email
            : bookingData.user?.email;

          mailDeliveryTasks.push(
            sendSendgridMail(
              {
                to: recipientAddress,
                subject: messageContent.emailSubject,
                html: messageContent.emailBody,
                batchId: batchIdentifier,
                sendAt: dayjs(notification.scheduledDate).unix(),
                replyTo: responseAddress,
                attachments: notification.workflowStep.includeCalendarEvent
                  ? [
                      {
                        content: Buffer.from(
                          generateIcsString({ event: eventData, status: "CONFIRMED", isOrganizer: false }) ||
                            ""
                        ).toString("base64"),
                        filename: "event.ics",
                        type: "text/calendar; method=REQUEST",
                        disposition: "attachment",
                        contentId: generateUuid(),
                      },
                    ]
                  : undefined,
              },
              { sender: notification.workflowStep.sender },
              {
                ...(notification.booking.eventTypeId && {
                  eventTypeId: notification.booking.eventTypeId,
                }),
              }
            ).then(() =>
              prisma.calIdWorkflowReminder.update({
                where: {
                  id: notification.id,
                },
                data: {
                  scheduled: true,
                  referenceId: batchIdentifier,
                },
              })
            )
          );
        }
      } catch (error) {
        logger.error(`Failed to schedule Email notification: ${error}`);
      }
    } else if (notification.isMandatoryReminder) {
      try {
        const recipientAddress = notification.booking.attendees[0].email;
        const recipientName = notification.booking.attendees[0].name;
        const participantName = notification.booking.user?.name;
        const userTimeZone = notification.booking.attendees[0].timeZone;

        let messageContent = {
          emailSubject: "",
          emailBody: "",
        };

        const isBodyEmpty = false;

        messageContent = emailReminderTemplate({
          isEditingMode: false,
          locale: notification.booking.user?.locale || "en",
          action: WorkflowActions.EMAIL_ATTENDEE,
          timeFormat: getTimeFormatStringFromUserTimeFormat(notification.booking.user?.timeFormat),
          startTime: notification.booking.startTime.toISOString() || "",
          endTime: notification.booking.endTime.toISOString() || "",
          eventName: notification.booking.eventType?.title || "",
          timeZone: userTimeZone || "",
          location: notification.booking.location || "",
          meetingUrl: bookingMetadataSchema.parse(notification.booking.metadata || {})?.videoCallUrl || "",
          otherPerson: participantName || "",
          name: recipientName || "",
          isBrandingDisabled: !!notification.booking.user?.hideBranding,
        });
        if (messageContent.emailSubject.length > 0 && !isBodyEmpty && recipientAddress) {
          const batchIdentifier = await getBatchId();

          mailDeliveryTasks.push(
            sendSendgridMail(
              {
                to: recipientAddress,
                subject: messageContent.emailSubject,
                html: messageContent.emailBody,
                batchId: batchIdentifier,
                sendAt: dayjs(notification.scheduledDate).unix(),
                replyTo: notification.booking?.userPrimaryEmail ?? notification.booking.user?.email,
              },
              { sender: notification.workflowStep?.sender },
              {
                ...(notification.booking.eventTypeId && {
                  eventTypeId: notification.booking.eventTypeId,
                }),
              }
            ).then(() =>
              prisma.calIdWorkflowReminder.update({
                where: {
                  id: notification.id,
                },
                data: {
                  scheduled: true,
                  referenceId: batchIdentifier,
                },
              })
            )
          );
        }
      } catch (error) {
        logger.error(`Failed to schedule Email notification: ${error}`);
      }
    }
  });

  Promise.allSettled(mailDeliveryTasks).then((outcomes) => {
    outcomes.forEach((outcome) => {
      if (outcome.status === "rejected") {
        logger.error("Email delivery failed", outcome.reason);
      }
    });
  });
  return pendingNotifications;
};

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization");

    if (!process.env.CRON_SECRET || authorizationHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
      return NextResponse.json({ message: "No SendGrid API key or email" }, { status: 405 });
    }

    //preventing removal of past notifications
    // await removePastNotifications();
    await processCancelledNotifications();

    const pendingNotifications: PartialCalIdWorkflowReminder[] = await processNotificationScheduling();

    return NextResponse.json(
      {
        message: `${pendingNotifications.length} Emails to schedule`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in email queue processing:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
