import dayjs from "@calcom/dayjs";
import { getSenderId } from "@calcom/features/ee/workflows/lib/alphanumericSenderIdSupport";
import { sendSmsOrFallbackEmail } from "@calcom/features/ee/workflows/lib/reminders/messageDispatcher";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_ID } from "@calcom/lib/constants";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

const handleSendingSMS = async ({
  reminderPhone,
  smsMessage,
  senderID,
  teamId,
  bookingUid,
  organizerUserId,
}: {
  reminderPhone: string;
  smsMessage: string;
  senderID: string;
  teamId?: number;
  bookingUid?: string | null;
  organizerUserId?: number;
}) => {
  try {
    // If teamId is provided, we check the rate limit for the team.
    // If organizerUserId is provided, we check the rate limit for the organizer.
    // If neither is provided(Just in case), we check the rate limit for the reminderPhone.
    await checkSMSRateLimit({
      identifier: teamId
        ? `handleSendingSMS:team:${teamId}`
        : organizerUserId
        ? `handleSendingSMS:user:${organizerUserId}`
        : `handleSendingSMS:user:${reminderPhone}`,
      rateLimitingType: "sms",
    });

    const smsOrFallbackEmail = await sendSmsOrFallbackEmail({
      twilioData: {
        phoneNumber: reminderPhone,
        body: smsMessage,
        sender: senderID,
        ...(!!teamId ? { teamId } : { userId: organizerUserId }),
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
  organizerUserId: number | undefined = undefined;
  private _isSMSNotificationEnabled: boolean | null = null;

  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
    this.teamId = this.calEvent?.team?.id;
    this.isTeamEvent = !!this.calEvent?.team?.id;
    this.organizerUserId = this.calEvent?.organizer?.id;
  }

  private async isSMSNotificationEnabled(): Promise<boolean> {
    if (this._isSMSNotificationEnabled !== null) {
      return this._isSMSNotificationEnabled;
    }

    const teamId = this.teamId;

    if (teamId) {
      const team = await TeamRepository.findTeamWithOrganizationSettings(teamId);

      this._isSMSNotificationEnabled = !team?.parent?.organizationSettings?.disablePhoneOnlySMSNotifications;
      return this._isSMSNotificationEnabled;
    }

    this._isSMSNotificationEnabled = true;
    return true;
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
      organizerUserId: this.organizerUserId,
    });
  }

  async sendSMSToAttendees() {
    const smsToSend: Promise<unknown>[] = [];

    if (!(await this.isSMSNotificationEnabled())) return;

    for (const attendee of this.calEvent.attendees) {
      smsToSend.push(this.sendSMSToAttendee(attendee, this.calEvent.uid));
    }

    await Promise.all(smsToSend);
  }
}
