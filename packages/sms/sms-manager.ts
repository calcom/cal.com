import dayjs from "@calcom/dayjs";
import { getSenderId } from "@calcom/features/ee/workflows/lib/alphanumericSenderIdSupport";
import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { SENDER_ID } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

const handleSendingSMS = ({
  reminderPhone,
  smsMessage,
  senderID,
  teamId,
}: {
  reminderPhone: string;
  smsMessage: string;
  senderID: string;
  teamId?: number;
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const sms = twilio.sendSMS(reminderPhone, smsMessage, senderID, teamId);
      resolve(sms);
    } catch (e) {
      reject(console.error(`twilio.sendSMS failed`, e));
    }
  });
};

export default abstract class SMSManager {
  calEvent: CalendarEvent;
  isTeamEvent = false;

  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
    this.isTeamEvent = !!calEvent?.team;
  }

  getFormattedTime(
    timezone: string,
    locale: string,
    time: string,
    format = `dddd, LL | ${TimeFormat.TWELVE_HOUR}`
  ) {
    return dayjs(time).tz(timeZone).locale(locale).format(format);
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
    if (!this.isTeamEvent || !this.calEvent?.team?.id) return;

    const attendeePhoneNumber = attendee.phoneNumber;
    if (attendeePhoneNumber) {
      const smsMessage = this.getMessage(attendee);
      const senderID = getSenderId(attendeePhoneNumber, SENDER_ID);
      const teamId = this.calEvent.team.id;
      return handleSendingSMS({ reminderPhone: attendeePhoneNumber, smsMessage, senderID, teamId });
    }
  }

  async sendSMSToAttendees() {
    if (!this.isTeamEvent) return;
    const smsToSend: Promise<unknown>[] = [];

    for (const attendee of this.calEvent.attendees) {
      smsToSend.push(this.sendSMSToAttendee(attendee));
    }

    await Promise.all(smsToSend);
  }
}
