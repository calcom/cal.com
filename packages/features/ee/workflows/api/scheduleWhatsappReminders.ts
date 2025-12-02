/* Schedule any workflow reminder that falls within the next 2 hours for WHATSAPP */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";

import { getWhatsappTemplateFunction, isAttendeeAction } from "../lib/actionHelperFunctions";
import type { PartialWorkflowReminder } from "../lib/getWorkflowReminders";
import { select } from "../lib/getWorkflowReminders";
import { scheduleSmsOrFallbackEmail } from "../lib/reminders/messageDispatcher";
import {
  getContentSidForTemplate,
  getContentVariablesForTemplate,
} from "../lib/reminders/templates/whatsapp/ContentSidMapping";

export async function handler(req: NextRequest) {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  //find all unscheduled WHATSAPP reminders
  const unscheduledReminders = (await prisma.workflowReminder.findMany({
    where: {
      method: WorkflowMethods.WHATSAPP,
      scheduled: false,
      scheduledDate: {
        gte: new Date(),
        lte: dayjs().add(2, "hour").toISOString(),
      },
      retryCount: {
        lt: 3, // Don't continue retrying if it's already failed 3 times
      },
    },
    select,
  })) as PartialWorkflowReminder[];

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
      // For seated events, get the correct attendee based on seatReferenceId
      let targetAttendee = reminder.booking?.attendees[0];
      if (reminder.seatReferenceId) {
        const bookingSeatRepository = new BookingSeatRepository(prisma);
        const seatAttendeeData = await bookingSeatRepository.getByReferenceUidWithAttendeeDetails(
          reminder.seatReferenceId
        );
        if (seatAttendeeData?.attendee) {
          targetAttendee = seatAttendeeData.attendee;
        }
      }

      const sendTo =
        reminder.workflowStep.action === WorkflowActions.WHATSAPP_NUMBER
          ? reminder.workflowStep.sendTo
          : targetAttendee?.phoneNumber;

      const userName =
        reminder.workflowStep.action === WorkflowActions.WHATSAPP_ATTENDEE ? targetAttendee?.name || "" : "";

      const attendeeName =
        reminder.workflowStep.action === WorkflowActions.WHATSAPP_ATTENDEE
          ? reminder.booking?.user?.name
          : targetAttendee?.name;

      const timeZone =
        reminder.workflowStep.action === WorkflowActions.WHATSAPP_ATTENDEE
          ? targetAttendee?.timeZone
          : reminder.booking?.user?.timeZone;

      const startTime = reminder.booking?.startTime.toISOString();
      const locale = reminder.booking.user?.locale || "en";
      const timeFormat = getTimeFormatStringFromUserTimeFormat(reminder.booking.user?.timeFormat);

      const templateFunction = getWhatsappTemplateFunction(reminder.workflowStep.template);
      const contentSid = getContentSidForTemplate(reminder.workflowStep.template);
      const contentVariables = getContentVariablesForTemplate({
        name: userName,
        attendeeName: attendeeName || "",
        eventName: reminder.booking?.eventType?.title,
        eventDate: dayjs(startTime).tz(timeZone).locale(locale).format("YYYY MMM D"),
        startTime: dayjs(startTime)
          .tz(timeZone)
          .locale(locale)
          .format(timeFormat || "h:mma"),
        timeZone,
      });
      const message = templateFunction(
        false,
        reminder.booking.user?.locale || "en",
        reminder.workflowStep.action,
        timeFormat,
        startTime || "",
        reminder.booking?.eventType?.title || "",
        timeZone || "",
        attendeeName || "",
        userName
      );

      if (message?.length && message?.length > 0 && sendTo) {
        const creditService = new CreditService();

        const scheduledNotification = await scheduleSmsOrFallbackEmail({
          twilioData: {
            phoneNumber: sendTo,
            body: message,
            scheduledDate: reminder.scheduledDate,
            sender: "",
            bookingUid: reminder.booking.uid,
            userId,
            teamId,
            isWhatsapp: true,
            contentSid,
            contentVariables,
          },
          fallbackData:
            reminder.workflowStep.action && isAttendeeAction(reminder.workflowStep.action)
              ? {
                  email: targetAttendee?.email,
                  t: await getTranslation(targetAttendee?.locale || "en", "common"),
                  replyTo: reminder.booking?.user?.email ?? "",
                  workflowStepId: reminder.workflowStep.id,
                }
              : undefined,
          creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
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
          await prisma.workflowReminder.delete({
            where: {
              id: reminder.id,
            },
          });
        }
      }
    } catch (error) {
      console.log(`Error scheduling WHATSAPP with error ${error}`);
    }
  }

  return NextResponse.json({ message: "WHATSAPP scheduled" }, { status: 200 });
}
