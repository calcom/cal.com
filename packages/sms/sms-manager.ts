import dayjs from "@calcom/dayjs";
import { getSenderId } from "@calcom/features/ee/workflows/lib/alphanumericSenderIdSupport";
import { sendSmsOrFallbackEmail } from "@calcom/features/ee/workflows/lib/reminders/messageDispatcher";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_ID } from "@calcom/lib/constants";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { TimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

const handleSendingSMS = async ({
  reminderPhone,
  smsMessage,
  senderID,
  teamId,
  bookingUid,
}: {
  reminderPhone: string;
  smsMessage: string;
  senderID: string;
  teamId?: number;
  bookingUid?: string | null;
}) => {
  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        parent: {
          select: {
            isOrganization: true,
            organizationSettings: {
              select: {
                disablePhoneOnlySMSNotifications: true,
              },
            },
          },
        },
      },
    });

    if (team?.parent?.organizationSettings?.disablePhoneOnlySMSNotifications) {
      return; // resolves implicitly (as undefined)
    }
  }

  try {
    await checkSMSRateLimit({
      identifier: teamId ? `handleSendingSMS:team:${teamId}` : `handleSendingSMS:user:${reminderPhone}`,
      rateLimitingType: "sms",
    });

    const smsOrFallbackEmail = await sendSmsOrFallbackEmail({
      twilioData: {
        phoneNumber: reminderPhone,
        body: smsMessage,
        sender: senderID,
        teamId,
        bookingUid,
      },
    });

    return smsOrFallbackEmail;
  } catch (e) {
    console.error("sendSmsOrFallbackEmail failed", e);
    throw e; // propagate the error
  }
};

export default abstract class SMSManager {
  calEvent: CalendarEvent;
  isTeamEvent = false;
  teamId: number | undefined = undefined;
  private _isSMSNotificationEnabled: boolean | null = null;

  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
    this.teamId = this.calEvent?.team?.id;
    this.isTeamEvent = !!this.calEvent?.team?.id;
  }

  private async isSMSNotificationEnabled(): Promise<boolean> {
    if (this._isSMSNotificationEnabled !== null) {
      return this._isSMSNotificationEnabled;
    }

    if (!this.calEvent.eventTypeId) {
      this._isSMSNotificationEnabled = false;
      return false;
    }

    const eventType = await prisma.eventType.findUnique({
      where: { id: this.calEvent.eventTypeId },
      select: { bookingFields: true },
    });

    const parsedBookingFields = eventTypeBookingFields.parse(eventType?.bookingFields || []);

    this._isSMSNotificationEnabled =
      parsedBookingFields.length > 0
        ? !!parsedBookingFields.find(
            (field) => field.name === "attendeePhoneNumber" && field.enableSMSNotification
          )
        : true;

    return this._isSMSNotificationEnabled;
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

    if (!attendeePhoneNumber || !isPhoneOnlyBooking || !(await this.isSMSNotificationEnabled())) return;

    const smsMessage = this.getMessage(attendee);
    const senderID = getSenderId(attendeePhoneNumber, SENDER_ID);
    return handleSendingSMS({
      reminderPhone: attendeePhoneNumber,
      smsMessage,
      senderID,
      teamId,
      bookingUid,
    });
  }

  async sendSMSToAttendees() {
    const smsToSend: Promise<unknown>[] = [];
    console.log("sendSMSToAttendees", this.calEvent);
    if (!(await this.isSMSNotificationEnabled())) return;

    for (const attendee of this.calEvent.attendees) {
      smsToSend.push(this.sendSMSToAttendee(attendee, this.calEvent.uid));
    }

    await Promise.all(smsToSend);
  }
}
