import dayjs from "@calcom/dayjs";
import { dub } from "@calcom/features/auth/lib/dub";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import { IMMEDIATE_WORKFLOW_TRIGGER_EVENTS } from "../constants";
import { getWorkflowRecipientEmail } from "../getWorkflowReminders";
import type { AttendeeInBookingInfo, BookingInfo } from "../types";
import type { VariablesType } from "./templates/customTemplate";
import customTemplate, { transformBookingResponsesToVariableFormat } from "./templates/customTemplate";

export const bulkShortenLinks = async (links: string[]) => {
  if (!process.env.DUB_API_KEY) {
    return links.map((link) => ({ shortLink: link }));
  }

  const linksToShorten = links.filter((link) => link);
  const results = await dub.links.createMany(
    linksToShorten.map((link) => ({
      domain: "sms.cal.com",
      url: link,
      folderId: "fold_wx3NZDKQYbLDbncSubeMu0ss",
    }))
  );
  return links.map((link) => {
    const createdLink = results.find(
      (result): result is Extract<typeof result, { url: string }> =>
        !("error" in result) && result.url === link
    );
    if (createdLink) {
      return { shortLink: createdLink.shortLink };
    } else {
      return { shortLink: link };
    }
  });
};

export const getSMSMessageWithVariables = async (
  smsMessage: string,
  evt: BookingInfo,
  attendeeToBeUsedInSMS: AttendeeInBookingInfo,
  action: WorkflowActions
) => {
  const recipientEmail = getWorkflowRecipientEmail({
    action,
    attendeeEmail: attendeeToBeUsedInSMS.email,
  });
  const urls = {
    meetingUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl || "",
    cancelLink: `${evt.bookerUrl ?? WEBSITE_URL}/booking/${evt.uid}?cancel=true${
      recipientEmail ? `&cancelledBy=${recipientEmail}` : ""
    }`,
    rescheduleLink: `${evt.bookerUrl ?? WEBSITE_URL}/reschedule/${evt.uid}${
      recipientEmail ? `?rescheduledBy=${recipientEmail}` : ""
    }`,
  };

  const [{ shortLink: meetingUrl }, { shortLink: cancelLink }, { shortLink: rescheduleLink }] =
    await bulkShortenLinks([urls.meetingUrl, urls.cancelLink, urls.rescheduleLink]);

  const timeZone =
    action === WorkflowActions.SMS_ATTENDEE ? attendeeToBeUsedInSMS.timeZone : evt.organizer.timeZone;

  const variables: VariablesType = {
    eventName: evt.title,
    organizerName: evt.organizer.name,
    attendeeName: attendeeToBeUsedInSMS.name,
    attendeeFirstName: attendeeToBeUsedInSMS.firstName,
    attendeeLastName: attendeeToBeUsedInSMS.lastName,
    attendeeEmail: attendeeToBeUsedInSMS.email,
    eventDate: dayjs(evt.startTime).tz(timeZone),
    eventEndTime: dayjs(evt.endTime).tz(timeZone),
    timeZone: timeZone,
    location: evt.location,
    additionalNotes: evt.additionalNotes,
    responses: transformBookingResponsesToVariableFormat(evt.responses),
    meetingUrl,
    cancelLink,
    rescheduleLink,
    cancelReason: evt.cancellationReason,
    rescheduleReason: evt.rescheduleReason,
    attendeeTimezone: evt.attendees[0].timeZone,
    eventTimeInAttendeeTimezone: dayjs(evt.startTime).tz(evt.attendees[0].timeZone),
    eventEndTimeInAttendeeTimezone: dayjs(evt.endTime).tz(evt.attendees[0].timeZone),
  };

  const locale =
    action === WorkflowActions.SMS_ATTENDEE
      ? attendeeToBeUsedInSMS.language?.locale
      : evt.organizer.language.locale;

  const customMessage = customTemplate(smsMessage, variables, locale, evt.organizer.timeFormat);
  smsMessage = customMessage.text;

  return smsMessage;
};

export const getAttendeeToBeUsedInSMS = (
  action: WorkflowActions,
  evt: BookingInfo,
  reminderPhone: string | null
) => {
  let attendeeToBeUsedInSMS: AttendeeInBookingInfo | null = null;
  if (action === WorkflowActions.SMS_ATTENDEE) {
    const attendeeWithReminderPhoneAsSMSReminderNumber =
      reminderPhone && evt.attendees.find((attendee) => attendee.email === evt.responses?.email?.value);
    attendeeToBeUsedInSMS = attendeeWithReminderPhoneAsSMSReminderNumber
      ? attendeeWithReminderPhoneAsSMSReminderNumber
      : evt.attendees[0];
  } else {
    attendeeToBeUsedInSMS = evt.attendees[0];
  }

  return attendeeToBeUsedInSMS;
};

export const shouldUseTwilio = (trigger: WorkflowTriggerEvents, scheduledDate: dayjs.Dayjs | null) => {
  if (IMMEDIATE_WORKFLOW_TRIGGER_EVENTS.includes(trigger)) {
    return true;
  }

  if (trigger === WorkflowTriggerEvents.BEFORE_EVENT || trigger === WorkflowTriggerEvents.AFTER_EVENT) {
    const currentDate = dayjs();
    if (
      scheduledDate &&
      currentDate.isBefore(scheduledDate.subtract(15, "minute")) &&
      !scheduledDate.isAfter(currentDate.add(2, "hour"))
    ) {
      return true;
    }
  }
  return false;
};
