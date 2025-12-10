import { scheduleAIPhoneCall } from "@calcom/ee/workflows/lib/reminders/aiPhoneCallManager";
import { scheduleEmailReminder } from "@calcom/ee/workflows/lib/reminders/emailReminderManager";
import { scheduleSMSReminder } from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import { scheduleWhatsappReminder } from "@calcom/ee/workflows/lib/reminders/whatsappReminderManager";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { WorkflowStep } from "@calcom/prisma/client";
import type { TimeUnit } from "@calcom/prisma/enums";
import { SchedulingType, WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalEventResponses } from "@calcom/types/Calendar";

import type { getBookings } from "./scheduleWorkflowNotifications";
import { verifyEmailSender } from "./verifyEmailSender";

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type Bookings = UnwrapPromise<ReturnType<typeof getBookings>>;

// some parts of  scheduleWorkflowReminders (reminderSchedule.ts) is quite similar to this code
// we should consider refactoring this to  reuse similar code snippets
export async function scheduleBookingReminders(
  bookings: Bookings,
  workflowSteps: Partial<WorkflowStep>[],
  time: number | null,
  timeUnit: TimeUnit | null,
  trigger: WorkflowTriggerEvents,
  userId: number,
  teamId: number | null,
  isOrg: boolean
) {
  if (!bookings.length) return;
  if (trigger !== WorkflowTriggerEvents.BEFORE_EVENT && trigger !== WorkflowTriggerEvents.AFTER_EVENT) return;

  const bookerUrl = await getBookerBaseUrl(isOrg ? teamId : null);

  const creditService = new CreditService();

  //create reminders for all bookings for each workflow step
  const promiseSteps = workflowSteps.map(async (step) => {
    const promiseScheduleReminders = bookings.map(async (booking) => {
      const defaultLocale = "en";
      const bookingInfo = {
        uid: booking.uid,
        bookerUrl,
        type: booking.eventType?.slug || "event",
        attendees: booking.attendees.map((attendee) => {
          return {
            name: attendee.name,
            email: attendee.email,
            timeZone: attendee.timeZone,
            language: { locale: attendee.locale || defaultLocale },
          };
        }),
        organizer: booking.user
          ? {
              language: { locale: booking.user.locale || defaultLocale },
              name: booking.user.name || "",
              email: booking?.userPrimaryEmail ?? booking.user.email,
              timeZone: booking.user.timeZone,
              timeFormat: getTimeFormatStringFromUserTimeFormat(booking.user.timeFormat),
            }
          : { name: "", email: "", timeZone: "", language: { locale: "" } },
        startTime: booking.startTime?.toISOString(),
        endTime: booking.endTime?.toISOString(),
        title: booking.title,
        language: { locale: booking?.user?.locale || defaultLocale },
        hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
        eventType: {
          slug: booking.eventType?.slug || "",
          schedulingType: booking.eventType?.schedulingType,
          hosts: booking.eventType?.hosts,
        },
        metadata: booking.metadata,
        customReplyToEmail: booking.eventType?.customReplyToEmail,
        responses: booking.responses as CalEventResponses | null,
      };
      if (
        step.action === WorkflowActions.EMAIL_HOST ||
        step.action === WorkflowActions.EMAIL_ATTENDEE ||
        step.action === WorkflowActions.EMAIL_ADDRESS
      ) {
        let sendTo: string[] = [];

        switch (step.action) {
          case WorkflowActions.EMAIL_HOST: {
            sendTo = [bookingInfo.organizer?.email];
            const schedulingType = bookingInfo.eventType.schedulingType;
            const hosts = bookingInfo.eventType.hosts
              ?.filter((host) => bookingInfo.attendees.some((attendee) => attendee.email === host.user.email))
              .map(({ user }) => user.destinationCalendar?.primaryEmail ?? user.email);
            if (
              hosts &&
              (schedulingType === SchedulingType.ROUND_ROBIN || schedulingType === SchedulingType.COLLECTIVE)
            ) {
              sendTo = sendTo.concat(hosts);
            }
            break;
          }
          case WorkflowActions.EMAIL_ATTENDEE:
            sendTo = bookingInfo.attendees.map((attendee) => attendee.email);
            break;
          case WorkflowActions.EMAIL_ADDRESS:
            await verifyEmailSender(step.sendTo || "", userId, teamId);
            sendTo = [step.sendTo || ""];
            break;
        }

        await scheduleEmailReminder({
          evt: bookingInfo,
          triggerEvent: trigger,
          action: step.action,
          timeSpan: {
            time,
            timeUnit,
          },
          sendTo,
          emailSubject: step.emailSubject || "",
          emailBody: step.reminderBody || "",
          template: step.template,
          sender: step.sender,
          workflowStepId: step.id,
          verifiedAt: step?.verifiedAt ?? null,
        });
      } else if (step.action === WorkflowActions.SMS_NUMBER && step.sendTo) {
        await scheduleSMSReminder({
          evt: bookingInfo,
          reminderPhone: step.sendTo,
          triggerEvent: trigger,
          action: step.action,
          timeSpan: {
            time,
            timeUnit,
          },
          message: step.reminderBody || "",
          workflowStepId: step.id,
          template: step.template,
          sender: step.sender,
          userId: userId,
          teamId: teamId,
          verifiedAt: step?.verifiedAt ?? null,
          creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
        });
      } else if (step.action === WorkflowActions.WHATSAPP_NUMBER && step.sendTo) {
        await scheduleWhatsappReminder({
          evt: bookingInfo,
          reminderPhone: step.sendTo,
          triggerEvent: trigger,
          action: step.action,
          timeSpan: {
            time,
            timeUnit,
          },
          message: step.reminderBody || "",
          workflowStepId: step.id || 0,
          template: step.template,
          userId: userId,
          teamId: teamId,
          verifiedAt: step?.verifiedAt ?? null,
          creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
        });
      } else if (booking.smsReminderNumber) {
        if (step.action === WorkflowActions.SMS_ATTENDEE) {
          await scheduleSMSReminder({
            evt: bookingInfo,
            reminderPhone: booking.smsReminderNumber,
            triggerEvent: trigger,
            action: step.action,
            timeSpan: {
              time,
              timeUnit,
            },
            message: step.reminderBody || "",
            workflowStepId: step.id,
            template: step.template,
            sender: step.sender,
            userId: userId,
            teamId: teamId,
            verifiedAt: step?.verifiedAt ?? null,
            creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
          });
        } else if (step.action === WorkflowActions.WHATSAPP_ATTENDEE) {
          await scheduleWhatsappReminder({
            evt: bookingInfo,
            reminderPhone: booking.smsReminderNumber,
            triggerEvent: trigger,
            action: step.action,
            timeSpan: {
              time,
              timeUnit,
            },
            message: step.reminderBody || "",
            workflowStepId: step.id,
            template: step.template,
            sender: step.sender,
            userId: userId,
            teamId: teamId,
            verifiedAt: step?.verifiedAt ?? null,
            creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
          });
        }
      } else if (step.action === WorkflowActions.CAL_AI_PHONE_CALL) {
        await scheduleAIPhoneCall({
          evt: bookingInfo,
          triggerEvent: trigger,
          timeSpan: {
            time,
            timeUnit,
          },
          workflowStepId: step.id,
          userId,
          teamId,
          verifiedAt: step?.verifiedAt ?? null,
          submittedPhoneNumber: booking.smsReminderNumber,
          routedEventTypeId: null,
        });
      }
    });
    await Promise.all(promiseScheduleReminders);
  });
  return Promise.all(promiseSteps);
}
