import * as smsService from "@calid/features/modules/workflows/providers/messaging/dispatcher";
import { getSenderId } from "@calid/features/modules/workflows/utils/getSenderId";

import dayjs from "@calcom/dayjs";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_ID } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowTemplates } from "@calcom/prisma/enums";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

const handleSendingSMS = ({
  reminderPhone,
  smsMessage,
  senderID,
  userId,
}: {
  reminderPhone: string;
  smsMessage: string;
  senderID: string;
  userId: number;
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      await checkSMSRateLimit({
        identifier: `sms:user:${userId}`,
        rateLimitingType: "smsMonth",
      });
      const sms = smsService.sendSMS(reminderPhone, smsMessage, senderID, userId);
      resolve(sms);
    } catch (e) {
      reject(console.error(`smsService.sendSMS failed`, e));
    }
  });
};

export default abstract class SMSManager {
  calEvent: CalendarEvent;

  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
  }

  getTemplateMessage(attendee: Person, templates: WorkflowTemplates) {
    const recipientName = attendee.name;
    const recipientTimezone = attendee.timeZone;
    const meetingTitle = this.getEventTitleFromBookingTitle(this.calEvent.title);
    const recipientLocale = attendee.language?.locale;
    const organizerName = this.calEvent.organizer.name;
    const eventMoment = dayjs(this.calEvent.startTime).tz(recipientTimezone).locale(recipientLocale);
    const formattedDate = eventMoment.format("DD MMM YYYY");
    const formattedTimeWithLocalizedTimeZone = eventMoment.format("h:mma [GMT]Z");
    const [formattedTime, localizedRecipientTimezone] = formattedTimeWithLocalizedTimeZone.split(" ");

    switch (templates) {
      case WorkflowTemplates.CONFIRMATION:
        return `Hi ${recipientName} - You are all set! Your meeting "${meetingTitle} with ${organizerName}" is confirmed for ${formattedDate} at ${formattedTime} ${localizedRecipientTimezone}. See you then!\n\n- Cal ID`;

      case WorkflowTemplates.RESCHEDULED:
        return `Hi ${recipientName} - Your meeting "${meetingTitle} with ${organizerName}" has a new time: ${formattedDate} at ${formattedTime} ${localizedRecipientTimezone}. See you then!\n\n- Cal ID`;

      case WorkflowTemplates.CANCELLED:
        return `Hi ${recipientName} - Your meeting "${meetingTitle} with ${organizerName}" scheduled for ${formattedDate} at ${formattedTime} ${localizedRecipientTimezone} has been cancelled.\n\n- Cal ID`;

      default:
        return `Hi ${recipientName} - You are all set! Your meeting "${meetingTitle} with ${organizerName}" is confirmed for ${formattedDate} at ${formattedTime} ${localizedRecipientTimezone}. See you then!\n\n- Cal ID`;
    }
  }

  getEventTitleFromBookingTitle = (str: string) => {
    const match = str.match(/^(.*?)\s+between\b/i);
    return match ? match[1].trim() : str;
  };

  getFormattedTime(
    timezone: string,
    locale: string,
    time: string,
    format = `dddd, LL | ${TimeFormat.TWELVE_HOUR}`
  ) {
    return dayjs(time).tz(timezone).locale(locale).format(format);
  }

  getFormattedDate(timezone: string, locale: string) {
    return `${this.getFormattedTime(timezone, locale, this.calEvent.startTime)} - ${this.getFormattedTime(
      timezone,
      locale,
      this.calEvent.endTime
    )} (${timezone})`;
  }

  abstract getMessage(attendee: Person): string;

  async sendSMSToAttendee(attendee: Person) {
    const attendeePhoneNumber = attendee.phoneNumber;
    if (!attendeePhoneNumber) return;

    const smsMessage = this.getMessage(attendee);
    const senderID = getSenderId(attendeePhoneNumber, SENDER_ID);
    const organizerUserId = this.calEvent.organizer.id;
    if (!organizerUserId) return Promise.resolve();

    return handleSendingSMS({
      reminderPhone: attendeePhoneNumber,
      smsMessage,
      senderID,
      userId: organizerUserId,
    });
  }

  async sendSMSToAttendees() {
    // return Promise.resolve();

    const smsToSend: Promise<unknown>[] = [];
    for (const attendee of this.calEvent.attendees) {
      smsToSend.push(this.sendSMSToAttendee(attendee));
    }

    await Promise.all(smsToSend);
  }
}
