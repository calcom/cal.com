import dayjs from "@calcom/dayjs";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { checkSMSRateLimit } from "@calcom/lib/smsLockState";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

const handleSendingSMS = async ({
  reminderPhone,
  organizerUserId,
}: {
  reminderPhone: string;
  organizerUserId?: number;
}) => {
  await checkSMSRateLimit({
    identifier: organizerUserId
      ? `handleSendingSMS:org-user-${organizerUserId}`
      : `handleSendingSMS:user-${piiHasher.hash(reminderPhone)}`,
    rateLimitingType: "sms",
  });
};

export default abstract class SMSManager {
  calEvent: CalendarEvent;
  organizerUserId: number | undefined = undefined;

  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
    this.organizerUserId = this.calEvent?.organizer?.id;
  }

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
    const isPhoneOnlyBooking = attendeePhoneNumber && isSmsCalEmail(attendee.email);

    if (!attendeePhoneNumber || !isPhoneOnlyBooking) return;

    return handleSendingSMS({
      reminderPhone: attendeePhoneNumber,
      organizerUserId: this.organizerUserId,
    });
  }

  async sendSMSToAttendees() {
    const smsToSend: Promise<unknown>[] = [];

    for (const attendee of this.calEvent.attendees) {
      smsToSend.push(this.sendSMSToAttendee(attendee));
    }

    await Promise.all(smsToSend);
  }
}
