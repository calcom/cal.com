import * as twilio from "@calid/features/modules/workflows/providers/twilio";
import { getSenderId } from "@calid/features/modules/workflows/utils/getSenderId";

import dayjs from "@calcom/dayjs";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_ID } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
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
  teamId: number;
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

      if (!team?.parent?.isOrganization) return resolve(undefined);

      await checkSMSRateLimit({ identifier: `handleSendingSMS:team:${teamId}`, rateLimitingType: "sms" });
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

  async sendSMSToAttendee(attendee: Person) {
    const teamId = this.teamId;
    if (!this.isTeamEvent || !teamId) return;

    const attendeePhoneNumber = attendee.phoneNumber;
    if (!attendeePhoneNumber) return;

    const smsMessage = this.getMessage(attendee);
    const senderID = getSenderId(attendeePhoneNumber, SENDER_ID);
    return handleSendingSMS({ reminderPhone: attendeePhoneNumber, smsMessage, senderID, teamId });
  }

  async sendSMSToAttendees() {
    return Promise.resolve();
    if (!this.isTeamEvent) return;
    const smsToSend: Promise<unknown>[] = [];

    for (const attendee of this.calEvent.attendees) {
      smsToSend.push(this.sendSMSToAttendee(attendee));
    }

    await Promise.all(smsToSend);
  }
}
