/* Schedule any workflow reminder that falls within the next 2 hours for SMS */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import { bulkShortenLinks } from "@calcom/ee/workflows/lib/reminders/utils";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { isAttendeeAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { scheduleSmsOrFallbackEmail } from "@calcom/features/ee/workflows/lib/reminders/messageDispatcher";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import { getSenderId } from "../lib/alphanumericSenderIdSupport";
import type { PartialWorkflowReminder } from "../lib/getWorkflowReminders";
import { select, getWorkflowRecipientEmail } from "../lib/getWorkflowReminders";
import type { VariablesType } from "../lib/reminders/templates/customTemplate";
import customTemplate from "../lib/reminders/templates/customTemplate";
import smsReminderTemplate from "../lib/reminders/templates/smsReminderTemplate";
import { WorkflowOptOutService } from "../lib/service/workflowOptOutService";

export async function handler(req: NextRequest) {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  //find all unscheduled SMS reminders
  const unscheduledReminders = (await prisma.workflowReminder.findMany({
    where: {
      method: WorkflowMethods.SMS,
      scheduled: false,
      scheduledDate: {
        gte: new Date(),
        lte: dayjs().add(2, "hour").toISOString(),
      },
      retryCount: {
        lt: 3, // Don't continue retrying if it's already failed 3 times
      },
    },
    select: {
      ...select,
      retryCount: true,
    },
  })) as (PartialWorkflowReminder & { retryCount: number })[];

  if (!unscheduledReminders.length) {
    return NextResponse.json({ ok: true });
  }

  for (const reminder of unscheduledReminders) {
    if (!reminder.workflowStep || !reminder.booking) {
      continue;
    }
    const userId = reminder.workflowStep.workflow.userId;
    const teamId = reminder.workflowStep.workflow.teamId;

    try {
      const sendTo =
        reminder.workflowStep.action === WorkflowActions.SMS_NUMBER
          ? reminder.workflowStep.sendTo
          : reminder.booking?.smsReminderNumber;

      const userName =
        reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? reminder.booking?.attendees[0].name
          : "";

      const attendeeName =
        reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? reminder.booking?.user?.name
          : reminder.booking?.attendees[0].name;

      const timeZone =
        reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? reminder.booking?.attendees[0].timeZone
          : reminder.booking?.user?.timeZone;

      const senderID = getSenderId(sendTo, reminder.workflowStep.sender);

      const locale =
        reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE ||
        reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
          ? reminder.booking?.attendees[0].locale
          : reminder.booking?.user?.locale;

      let message: string | null = reminder.workflowStep.reminderBody || null;

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
          action: reminder.workflowStep.action || WorkflowActions.SMS_NUMBER,
          attendeeEmail: reminder.booking.attendees[0].email,
          organizerEmail: reminder.booking.user?.email,
        });

        const urls = {
          meetingUrl: bookingMetadataSchema.parse(reminder.booking?.metadata || {})?.videoCallUrl || "",
          cancelLink: `${bookerUrl}/booking/${reminder.booking.uid}?cancel=true${
            recipientEmail ? `&cancelledBy=${recipientEmail}` : ""
          }`,
          rescheduleLink: `${bookerUrl}/reschedule/${reminder.booking.uid}${
            recipientEmail ? `?rescheduledBy=${recipientEmail}` : ""
          }`,
        };

        const [{ shortLink: meetingUrl }, { shortLink: cancelLink }, { shortLink: rescheduleLink }] =
          await bulkShortenLinks([urls.meetingUrl, urls.cancelLink, urls.rescheduleLink]);

        const variables: VariablesType = {
          eventName: reminder.booking?.eventType?.title,
          organizerName: reminder.booking?.user?.name || "",
          attendeeName: reminder.booking?.attendees[0].name,
          attendeeEmail: reminder.booking?.attendees[0].email,
          eventDate: dayjs(reminder.booking?.startTime).tz(timeZone),
          eventEndTime: dayjs(reminder.booking?.endTime).tz(timeZone),
          timeZone: timeZone,
          location: reminder.booking?.location || "",
          additionalNotes: reminder.booking?.description,
          responses: responses,
          meetingUrl,
          cancelLink,
          rescheduleLink,
          attendeeTimezone: reminder.booking.attendees[0].timeZone,
          eventTimeInAttendeeTimezone: dayjs(reminder.booking.startTime).tz(
            reminder.booking.attendees[0].timeZone
          ),
          eventEndTimeInAttendeeTimezone: dayjs(reminder.booking?.endTime).tz(
            reminder.booking.attendees[0].timeZone
          ),
        };
        const customMessage = customTemplate(
          reminder.workflowStep.reminderBody || "",
          variables,
          locale || "en",
          getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat)
        );
        message = customMessage.text;
      } else if (reminder.workflowStep.template === WorkflowTemplates.REMINDER) {
        message = smsReminderTemplate(
          false,
          reminder.booking.user?.locale || "en",
          reminder.workflowStep.action,
          getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat),
          reminder.booking?.startTime.toISOString() || "",
          reminder.booking?.eventType?.title || "",
          timeZone || "",
          attendeeName || "",
          userName
        );
      }

      if (message?.length && message?.length > 0 && sendTo) {
        const smsMessageWithoutOptOut = message;

        if (process.env.TWILIO_OPT_OUT_ENABLED === "true") {
          message = await WorkflowOptOutService.addOptOutMessage(message, locale || "en");
        }

        const scheduledNotification = await scheduleSmsOrFallbackEmail({
          twilioData: {
            phoneNumber: sendTo,
            body: message,
            scheduledDate: reminder.scheduledDate,
            sender: senderID,
            bodyWithoutOptOut: smsMessageWithoutOptOut,
            bookingUid: reminder.booking.uid,
            userId,
            teamId,
          },
          fallbackData:
            reminder.workflowStep.action && isAttendeeAction(reminder.workflowStep.action)
              ? {
                  email: reminder.booking.attendees[0].email,
                  t: await getTranslation(locale || "en", "common"),
                  replyTo: reminder.booking?.user?.email ?? "",
                  workflowStepId: reminder.workflowStep.id,
                }
              : undefined,
        });

        if (scheduledNotification) {
          if (scheduledNotification.sid) {
            await prisma.workflowReminder.update({
              where: {
                id: reminder.id,
              },
              data: {
                scheduled: true,
                referenceId: scheduledNotification.sid,
              },
            });
          } else if (scheduledNotification.emailReminderId) {
            await prisma.workflowReminder.delete({
              where: {
                id: reminder.id,
              },
            });
          }
        } else {
          await prisma.workflowReminder.update({
            where: {
              id: reminder.id,
            },
            data: {
              retryCount: reminder.retryCount + 1,
            },
          });
        }
      }
    } catch (error) {
      await prisma.workflowReminder.update({
        where: {
          id: reminder.id,
        },
        data: {
          retryCount: reminder.retryCount + 1,
        },
      });
      console.log(`Error scheduling SMS with error ${error}`);
    }
  }

  return NextResponse.json({ message: "SMS scheduled" }, { status: 200 });
}
