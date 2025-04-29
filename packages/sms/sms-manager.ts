import dayjs from "@calcom/dayjs";
import { getSenderId } from "@calcom/features/ee/workflows/lib/alphanumericSenderIdSupport";
import { sendSmsOrFallbackEmail } from "@calcom/features/ee/workflows/lib/reminders/messageDispatcher";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_ID } from "@calcom/lib/constants";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { TimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

const handleSendingSMS = ({
  reminderPhone,
  smsMessage,
  senderID,
  teamId,
  bookingUid,
}: {
  reminderPhone: string;
  smsMessage: string;
  senderID: string;
  teamId: number;
  bookingUid?: string | null;
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
        },
        select: {
          parent: {
            select: {
              isOrganization: true,
            },
          },
        },
      });

      if (!team?.parent?.isOrganization) return;

      await checkSMSRateLimit({ identifier: `handleSendingSMS:team:${teamId}`, rateLimitingType: "sms" });

      const smsOrFallbackEmail = await sendSmsOrFallbackEmail({
        twilioData: {
          phoneNumber: reminderPhone,
          body: smsMessage,
          sender: senderID,
          teamId,
          bookingUid,
        },
      });
      resolve(smsOrFallbackEmail);
    } catch (e) {
      reject(console.error(`sendSmsOrFallbackEmail failed`, e));
    }
  });
};

export default abstract class SMSManager {
  calEvent: CalendarEvent;
  isTeamEvent = false;
  teamId: number | undefined = undefined;

  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
    this.teamId = this.calEvent?.team?.id;
    this.isTeamEvent = !!this.calEvent?.team?.id;
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

  async sendSMSToAttendee(attendee: Person, bookingUid?: string | null) {
    const teamId = this.teamId;
    const attendeePhoneNumber = attendee.phoneNumber;
    const isPhoneOnlyBooking = attendeePhoneNumber && isSmsCalEmail(attendee.email);

    if (!this.isTeamEvent || !teamId || !attendeePhoneNumber || !isPhoneOnlyBooking) return;

    const smsMessage = this.getMessage(attendee);
    const senderID = getSenderId(attendeePhoneNumber, SENDER_ID);
    return handleSendingSMS({ reminderPhone: attendeePhoneNumber, smsMessage, senderID, teamId, bookingUid });
  }

  async sendSMSToAttendees() {
    if (!this.isTeamEvent) return;
    const smsToSend: Promise<unknown>[] = [];

    for (const attendee of this.calEvent.attendees) {
      smsToSend.push(this.sendSMSToAttendee(attendee, this.calEvent.uid));
    }

    await Promise.all(smsToSend);
  }
}
