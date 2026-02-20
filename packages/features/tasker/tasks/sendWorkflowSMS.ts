import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { getSenderId } from "@calcom/features/ee/workflows/lib/alphanumericSenderIdSupport";
import { getWorkflowRecipientEmail } from "@calcom/features/ee/workflows/lib/getWorkflowReminders";
import { isAttendeeAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import type { VariablesType } from "@calcom/features/ee/workflows/lib/reminders/templates/customTemplate";
import customTemplate from "@calcom/features/ee/workflows/lib/reminders/templates/customTemplate";
import smsReminderTemplate from "@calcom/features/ee/workflows/lib/reminders/templates/smsReminderTemplate";
import { sendSmsOrFallbackEmail } from "@calcom/features/ee/workflows/lib/reminders/messageDispatcher";
import { bulkShortenLinks } from "@calcom/features/ee/workflows/lib/reminders/utils";
import { WorkflowOptOutService } from "@calcom/features/ee/workflows/lib/service/workflowOptOutService";
import { WorkflowOptOutContactRepository } from "@calcom/features/ee/workflows/lib/repository/workflowOptOutContact";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/repositories/WorkflowReminderRepository";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

export const ZSendWorkflowSMSSchema = z.object({
  bookingUid: z.string(),
  workflowReminderId: z.number(),
});

export async function sendWorkflowSMS(payload: string): Promise<void> {
  const data = ZSendWorkflowSMSSchema.parse(JSON.parse(payload));

  const workflowReminderRepository = new WorkflowReminderRepository(prisma);
  const reminder = await workflowReminderRepository.findByIdForSMSTask(data.workflowReminderId);

  if (!reminder?.workflowStep || !reminder?.booking) {
    return;
  }

  if (!reminder.workflowStep.verifiedAt) {
    return;
  }

  const userId = reminder.workflowStep.workflow.userId;
  const teamId = reminder.workflowStep.workflow.teamId;

  let targetAttendee = reminder.booking.attendees?.[0];
  if (reminder.seatReferenceId) {
    const bookingSeatRepository = new BookingSeatRepository(prisma);
    const seatAttendeeData = await bookingSeatRepository.getByReferenceUidWithAttendeeDetails(
      reminder.seatReferenceId
    );
    if (seatAttendeeData?.attendee) {
      targetAttendee = seatAttendeeData.attendee;
    }
  }

  const attendeePhoneNumber =
    reminder.seatReferenceId && targetAttendee?.phoneNumber
      ? targetAttendee.phoneNumber
      : reminder.booking?.smsReminderNumber || targetAttendee?.phoneNumber;

  const sendTo =
    reminder.workflowStep.action === WorkflowActions.SMS_NUMBER
      ? reminder.workflowStep.sendTo
      : attendeePhoneNumber;

  if (!sendTo) {
    return;
  }

  if (await WorkflowOptOutContactRepository.isOptedOut(sendTo)) {
    return;
  }

  const userName =
    reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE ? targetAttendee?.name || "" : "";

  const attendeeName =
    reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
      ? reminder.booking?.user?.name
      : targetAttendee?.name;

  const timeZone =
    reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
      ? targetAttendee?.timeZone
      : reminder.booking?.user?.timeZone;

  const senderID = getSenderId(sendTo, reminder.workflowStep.sender);

  const locale =
    reminder.workflowStep.action === WorkflowActions.EMAIL_ATTENDEE ||
    reminder.workflowStep.action === WorkflowActions.SMS_ATTENDEE
      ? targetAttendee?.locale
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
      attendeeEmail: targetAttendee?.email,
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
      attendeeName: targetAttendee?.name,
      attendeeEmail: targetAttendee?.email,
      eventDate: dayjs(reminder.booking?.startTime).tz(timeZone),
      eventEndTime: dayjs(reminder.booking?.endTime).tz(timeZone),
      timeZone: timeZone,
      location: reminder.booking?.location || "",
      additionalNotes: reminder.booking?.description,
      responses: responses,
      meetingUrl,
      cancelLink,
      rescheduleLink,
      attendeeTimezone: targetAttendee?.timeZone,
      eventTimeInAttendeeTimezone: dayjs(reminder.booking.startTime).tz(targetAttendee?.timeZone),
      eventEndTimeInAttendeeTimezone: dayjs(reminder.booking.endTime).tz(targetAttendee?.timeZone),
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

  if (!message?.length || !sendTo) {
    return;
  }

  const smsMessageWithoutOptOut = await WorkflowOptOutService.addOptOutMessage(message, locale || "en");
  const creditService = new CreditService();

  await sendSmsOrFallbackEmail({
    twilioData: {
      phoneNumber: sendTo,
      body: message,
      sender: senderID,
      bodyWithoutOptOut: smsMessageWithoutOptOut,
      bookingUid: reminder.booking.uid,
      userId,
      teamId,
    },
    fallbackData:
      reminder.workflowStep.action && isAttendeeAction(reminder.workflowStep.action)
        ? {
            email: targetAttendee?.email,
            t: await getTranslation(locale || "en", "common"),
            replyTo: reminder.booking?.user?.email ?? "",
          }
        : undefined,
    creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
  });
}
