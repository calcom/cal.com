// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import type { TFunction } from "next-i18next";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import type BaseEmail from "@calcom/emails/templates/_base-email";
import { formatCalEvent } from "@calcom/lib/formatCalendarEvent";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import EventCancelledSMS from "../sms/event-cancelled-sms";
import EventDeclinedSMS from "../sms/event-declined-sms";
import EventSuccessfullyReScheduledSMS from "../sms/event-rescheduled-sms";
import EventSuccessfullyScheduledSMS from "../sms/event-scheduled-sms";
import type { MonthlyDigestEmailData } from "./src/templates/MonthlyDigestEmail";
import type { OrganizationAdminNoSlotsEmailInput } from "./src/templates/OrganizationAdminNoSlots";
import type { EmailVerifyLink } from "./templates/account-verify-email";
import AccountVerifyEmail from "./templates/account-verify-email";
import type { OrganizationNotification } from "./templates/admin-organization-notification";
import AdminOrganizationNotification from "./templates/admin-organization-notification";
import AttendeeAwaitingPaymentEmail from "./templates/attendee-awaiting-payment-email";
import AttendeeCancelledEmail from "./templates/attendee-cancelled-email";
import AttendeeCancelledSeatEmail from "./templates/attendee-cancelled-seat-email";
import AttendeeDailyVideoDownloadRecordingEmail from "./templates/attendee-daily-video-download-recording-email";
import AttendeeDailyVideoDownloadTranscriptEmail from "./templates/attendee-daily-video-download-transcript-email";
import AttendeeDeclinedEmail from "./templates/attendee-declined-email";
import AttendeeLocationChangeEmail from "./templates/attendee-location-change-email";
import AttendeeRequestEmail from "./templates/attendee-request-email";
import AttendeeRescheduledEmail from "./templates/attendee-rescheduled-email";
import AttendeeScheduledEmail from "./templates/attendee-scheduled-email";
import type { EmailVerifyCode } from "./templates/attendee-verify-email";
import AttendeeVerifyEmail from "./templates/attendee-verify-email";
import AttendeeWasRequestedToRescheduleEmail from "./templates/attendee-was-requested-to-reschedule-email";
import BookingRedirectEmailNotification from "./templates/booking-redirect-notification";
import type { IBookingRedirect } from "./templates/booking-redirect-notification";
import BrokenIntegrationEmail from "./templates/broken-integration-email";
import type { ChangeOfEmailVerifyLink } from "./templates/change-account-email-verify";
import ChangeOfEmailVerifyEmail from "./templates/change-account-email-verify";
import DisabledAppEmail from "./templates/disabled-app-email";
import type { Feedback } from "./templates/feedback-email";
import FeedbackEmail from "./templates/feedback-email";
import type { PasswordReset } from "./templates/forgot-password-email";
import ForgotPasswordEmail from "./templates/forgot-password-email";
import MonthlyDigestEmail from "./templates/monthly-digest-email";
import NoShowFeeChargedEmail from "./templates/no-show-fee-charged-email";
import OrganizationAdminNoSlotsEmail from "./templates/organization-admin-no-slots-email";
import type { OrganizationCreation } from "./templates/organization-creation-email";
import OrganizationCreationEmail from "./templates/organization-creation-email";
import type { OrganizationEmailVerify } from "./templates/organization-email-verification";
import OrganizationEmailVerification from "./templates/organization-email-verification";
import OrganizerAttendeeCancelledSeatEmail from "./templates/organizer-attendee-cancelled-seat-email";
import OrganizerCancelledEmail from "./templates/organizer-cancelled-email";
import OrganizerDailyVideoDownloadRecordingEmail from "./templates/organizer-daily-video-download-recording-email";
import OrganizerDailyVideoDownloadTranscriptEmail from "./templates/organizer-daily-video-download-transcript-email";
import OrganizerLocationChangeEmail from "./templates/organizer-location-change-email";
import OrganizerPaymentRefundFailedEmail from "./templates/organizer-payment-refund-failed-email";
import OrganizerRequestEmail from "./templates/organizer-request-email";
import OrganizerRequestReminderEmail from "./templates/organizer-request-reminder-email";
import OrganizerRequestedToRescheduleEmail from "./templates/organizer-requested-to-reschedule-email";
import OrganizerRescheduledEmail from "./templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "./templates/organizer-scheduled-email";
import SlugReplacementEmail from "./templates/slug-replacement-email";
import type { TeamInvite } from "./templates/team-invite-email";
import TeamInviteEmail from "./templates/team-invite-email";

const sendEmail = (prepare: () => BaseEmail) => {
  return new Promise((resolve, reject) => {
    try {
      const email = prepare();
      resolve(email.sendEmail());
    } catch (e) {
      reject(console.error(`${prepare.constructor.name}.sendEmail failed`, e));
    }
  });
};

export const sendScheduledEmailsAndSMS = async (
  calEvent: CalendarEvent,
  eventNameObject?: EventNameObjectType,
  hostEmailDisabled?: boolean,
  attendeeEmailDisabled?: boolean
) => {
  const formattedCalEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  if (!hostEmailDisabled) {
    emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent: formattedCalEvent })));

    if (formattedCalEvent.team) {
      for (const teamMember of formattedCalEvent.team.members) {
        emailsToSend.push(
          sendEmail(() => new OrganizerScheduledEmail({ calEvent: formattedCalEvent, teamMember }))
        );
      }
    }
  }

  if (!attendeeEmailDisabled) {
    emailsToSend.push(
      ...formattedCalEvent.attendees.map((attendee) => {
        return sendEmail(
          () =>
            new AttendeeScheduledEmail(
              {
                ...formattedCalEvent,
                ...(formattedCalEvent.hideCalendarNotes && { additionalNotes: undefined }),
                ...(eventNameObject && {
                  title: getEventName({ ...eventNameObject, t: attendee.language.translate }),
                }),
              },
              attendee
            )
        );
      })
    );
  }

  await Promise.all(emailsToSend);
  const successfullyScheduledSms = new EventSuccessfullyScheduledSMS(calEvent);
  await successfullyScheduledSms.sendSMSToAttendees();
};

// for rescheduled round robin booking that assigned new members
export const sendRoundRobinScheduledEmails = async (calEvent: CalendarEvent, members: Person[]) => {
  const formattedCalEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  for (const teamMember of members) {
    emailsToSend.push(
      sendEmail(() => new OrganizerScheduledEmail({ calEvent: formattedCalEvent, teamMember }))
    );
  }

  await Promise.all(emailsToSend);
};

export const sendRoundRobinRescheduledEmailsAndSMS = async (
  calEvent: CalendarEvent,
  teamMembersAndAttendees: Person[]
) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  for (const person of teamMembersAndAttendees) {
    emailsToSend.push(
      sendEmail(() => new OrganizerRescheduledEmail({ calEvent: calendarEvent, teamMember: person }))
    );
  }

  await Promise.all(emailsToSend);
  const successfullyReScheduledSMS = new EventSuccessfullyReScheduledSMS(calEvent);
  await successfullyReScheduledSMS.sendSMSToAttendees();
};

export const sendRoundRobinCancelledEmails = async (calEvent: CalendarEvent, members: Person[]) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  for (const teamMember of members) {
    emailsToSend.push(sendEmail(() => new OrganizerCancelledEmail({ calEvent: calendarEvent, teamMember })));
  }

  await Promise.all(emailsToSend);
};

export const sendRescheduledEmailsAndSMS = async (calEvent: CalendarEvent) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerRescheduledEmail({ calEvent: calendarEvent })));

  if (calendarEvent.team) {
    for (const teamMember of calendarEvent.team.members) {
      emailsToSend.push(
        sendEmail(() => new OrganizerRescheduledEmail({ calEvent: calendarEvent, teamMember }))
      );
    }
  }

  emailsToSend.push(
    ...calendarEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeRescheduledEmail(calendarEvent, attendee));
    })
  );

  await Promise.all(emailsToSend);
  const successfullyReScheduledSms = new EventSuccessfullyReScheduledSMS(calEvent);
  await successfullyReScheduledSms.sendSMSToAttendees();
};

export const sendRescheduledSeatEmailAndSMS = async (calEvent: CalendarEvent, attendee: Person) => {
  const calendarEvent = formatCalEvent(calEvent);

  const clonedCalEvent = cloneDeep(calendarEvent);
  const emailsToSend: Promise<unknown>[] = [
    sendEmail(() => new AttendeeRescheduledEmail(clonedCalEvent, attendee)),
    sendEmail(() => new OrganizerRescheduledEmail({ calEvent: calendarEvent })),
  ];

  const successfullyReScheduledSMS = new EventSuccessfullyReScheduledSMS(calEvent);
  await successfullyReScheduledSMS.sendSMSToAttendee(attendee);

  await Promise.all(emailsToSend);
};

export const sendScheduledSeatsEmails = async (
  calEvent: CalendarEvent,
  invitee: Person,
  newSeat: boolean,
  showAttendees: boolean,
  hostEmailDisabled?: boolean,
  attendeeEmailDisabled?: boolean
) => {
  const calendarEvent = formatCalEvent(calEvent);

  const emailsToSend: Promise<unknown>[] = [];

  if (!hostEmailDisabled) {
    emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent: calendarEvent, newSeat })));

    if (calendarEvent.team) {
      for (const teamMember of calendarEvent.team.members) {
        emailsToSend.push(
          sendEmail(() => new OrganizerScheduledEmail({ calEvent: calendarEvent, newSeat, teamMember }))
        );
      }
    }
  }

  if (!attendeeEmailDisabled) {
    emailsToSend.push(
      sendEmail(
        () =>
          new AttendeeScheduledEmail(
            {
              ...calendarEvent,
              ...(calendarEvent.hideCalendarNotes && { additionalNotes: undefined }),
            },
            invitee,
            showAttendees
          )
      )
    );
  }
  await Promise.all(emailsToSend);
};

export const sendCancelledSeatEmails = async (calEvent: CalendarEvent, cancelledAttendee: Person) => {
  const formattedCalEvent = formatCalEvent(calEvent);
  const clonedCalEvent = cloneDeep(formattedCalEvent);
  await Promise.all([
    sendEmail(() => new AttendeeCancelledSeatEmail(clonedCalEvent, cancelledAttendee)),
    sendEmail(() => new OrganizerAttendeeCancelledSeatEmail({ calEvent: formattedCalEvent })),
  ]);
};

export const sendOrganizerRequestEmail = async (calEvent: CalendarEvent) => {
  const calendarEvent = formatCalEvent(calEvent);

  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerRequestEmail({ calEvent: calendarEvent })));

  if (calendarEvent.team?.members) {
    for (const teamMember of calendarEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerRequestEmail({ calEvent: calendarEvent, teamMember })));
    }
  }

  await Promise.all(emailsToSend);
};

export const sendAttendeeRequestEmail = async (calEvent: CalendarEvent, attendee: Person) => {
  const calendarEvent = formatCalEvent(calEvent);
  await sendEmail(() => new AttendeeRequestEmail(calendarEvent, attendee));
};

export const sendDeclinedEmailsAndSMS = async (calEvent: CalendarEvent) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calendarEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeDeclinedEmail(calendarEvent, attendee));
    })
  );

  await Promise.all(emailsToSend);
  const eventDeclindedSms = new EventDeclinedSMS(calEvent);
  await eventDeclindedSms.sendSMSToAttendees();
};

export const sendCancelledEmailsAndSMS = async (
  calEvent: CalendarEvent,
  eventNameObject: Pick<EventNameObjectType, "eventName">
) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerCancelledEmail({ calEvent: calendarEvent })));

  if (calendarEvent.team?.members) {
    for (const teamMember of calendarEvent.team.members) {
      emailsToSend.push(
        sendEmail(() => new OrganizerCancelledEmail({ calEvent: calendarEvent, teamMember }))
      );
    }
  }

  emailsToSend.push(
    ...calendarEvent.attendees.map((attendee) => {
      return sendEmail(
        () =>
          new AttendeeCancelledEmail(
            {
              ...calendarEvent,
              title: getEventName({
                ...eventNameObject,
                t: attendee.language.translate,
                attendeeName: attendee.name,
                host: calendarEvent.organizer.name,
                eventType: calendarEvent.type,
                ...(calendarEvent.responses && { bookingFields: calendarEvent.responses }),
                ...(calendarEvent.location && { location: calendarEvent.location }),
              }),
            },
            attendee
          )
      );
    })
  );

  await Promise.all(emailsToSend);
  const eventCancelledSms = new EventCancelledSMS(calEvent);
  await eventCancelledSms.sendSMSToAttendees();
};

export const sendOrganizerRequestReminderEmail = async (calEvent: CalendarEvent) => {
  const calendarEvent = formatCalEvent(calEvent);

  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerRequestReminderEmail({ calEvent: calendarEvent })));

  if (calendarEvent.team?.members) {
    for (const teamMember of calendarEvent.team.members) {
      emailsToSend.push(
        sendEmail(() => new OrganizerRequestReminderEmail({ calEvent: calendarEvent, teamMember }))
      );
    }
  }
};

export const sendAwaitingPaymentEmail = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeAwaitingPaymentEmail(calEvent, attendee));
    })
  );
  await Promise.all(emailsToSend);
};

export const sendOrganizerPaymentRefundFailedEmail = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];
  emailsToSend.push(sendEmail(() => new OrganizerPaymentRefundFailedEmail({ calEvent })));

  if (calEvent.team?.members) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerPaymentRefundFailedEmail({ calEvent, teamMember })));
    }
  }

  await Promise.all(emailsToSend);
};

export const sendPasswordResetEmail = async (passwordResetEvent: PasswordReset) => {
  await sendEmail(() => new ForgotPasswordEmail(passwordResetEvent));
};

export const sendTeamInviteEmail = async (teamInviteEvent: TeamInvite) => {
  await sendEmail(() => new TeamInviteEmail(teamInviteEvent));
};

export const sendOrganizationCreationEmail = async (organizationCreationEvent: OrganizationCreation) => {
  await sendEmail(() => new OrganizationCreationEmail(organizationCreationEvent));
};

export const sendOrganizationAdminNoSlotsNotification = async (
  orgInviteEvent: OrganizationAdminNoSlotsEmailInput
) => {
  await sendEmail(() => new OrganizationAdminNoSlotsEmail(orgInviteEvent));
};

export const sendEmailVerificationLink = async (verificationInput: EmailVerifyLink) => {
  await sendEmail(() => new AccountVerifyEmail(verificationInput));
};

export const sendEmailVerificationCode = async (verificationInput: EmailVerifyCode) => {
  await sendEmail(() => new AttendeeVerifyEmail(verificationInput));
};

export const sendChangeOfEmailVerificationLink = async (verificationInput: ChangeOfEmailVerifyLink) => {
  await sendEmail(() => new ChangeOfEmailVerifyEmail(verificationInput));
};

export const sendRequestRescheduleEmail = async (
  calEvent: CalendarEvent,
  metadata: { rescheduleLink: string }
) => {
  const emailsToSend: Promise<unknown>[] = [];
  const calendarEvent = formatCalEvent(calEvent);

  emailsToSend.push(sendEmail(() => new OrganizerRequestedToRescheduleEmail(calendarEvent, metadata)));

  emailsToSend.push(sendEmail(() => new AttendeeWasRequestedToRescheduleEmail(calendarEvent, metadata)));

  await Promise.all(emailsToSend);
};

export const sendLocationChangeEmails = async (calEvent: CalendarEvent) => {
  const calendarEvent = formatCalEvent(calEvent);

  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerLocationChangeEmail({ calEvent: calendarEvent })));

  if (calendarEvent.team?.members) {
    for (const teamMember of calendarEvent.team.members) {
      emailsToSend.push(
        sendEmail(() => new OrganizerLocationChangeEmail({ calEvent: calendarEvent, teamMember }))
      );
    }
  }

  emailsToSend.push(
    ...calendarEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeLocationChangeEmail(calendarEvent, attendee));
    })
  );

  await Promise.all(emailsToSend);
};
export const sendFeedbackEmail = async (feedback: Feedback) => {
  await sendEmail(() => new FeedbackEmail(feedback));
};

export const sendBrokenIntegrationEmail = async (evt: CalendarEvent, type: "video" | "calendar") => {
  const calendarEvent = formatCalEvent(evt);
  await sendEmail(() => new BrokenIntegrationEmail(calendarEvent, type));
};

export const sendDisabledAppEmail = async ({
  email,
  appName,
  appType,
  t,
  title = undefined,
  eventTypeId = undefined,
}: {
  email: string;
  appName: string;
  appType: string[];
  t: TFunction;
  title?: string;
  eventTypeId?: number;
}) => {
  await sendEmail(() => new DisabledAppEmail(email, appName, appType, t, title, eventTypeId));
};

export const sendSlugReplacementEmail = async ({
  email,
  name,
  teamName,
  t,
  slug,
}: {
  email: string;
  name: string;
  teamName: string | null;
  t: TFunction;
  slug: string;
}) => {
  await sendEmail(() => new SlugReplacementEmail(email, name, teamName, slug, t));
};

export const sendNoShowFeeChargedEmail = async (attendee: Person, evt: CalendarEvent) => {
  await sendEmail(() => new NoShowFeeChargedEmail(evt, attendee));
};

export const sendDailyVideoRecordingEmails = async (calEvent: CalendarEvent, downloadLink: string) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    sendEmail(() => new OrganizerDailyVideoDownloadRecordingEmail(calendarEvent, downloadLink))
  );

  for (const attendee of calendarEvent.attendees) {
    emailsToSend.push(
      sendEmail(() => new AttendeeDailyVideoDownloadRecordingEmail(calendarEvent, attendee, downloadLink))
    );
  }
  await Promise.all(emailsToSend);
};

export const sendDailyVideoTranscriptEmails = async (calEvent: CalendarEvent, transcripts: string[]) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerDailyVideoDownloadTranscriptEmail(calEvent, transcripts)));

  for (const attendee of calEvent.attendees) {
    emailsToSend.push(
      sendEmail(() => new AttendeeDailyVideoDownloadTranscriptEmail(calEvent, attendee, transcripts))
    );
  }
  await Promise.all(emailsToSend);
};

export const sendOrganizationEmailVerification = async (sendOrgInput: OrganizationEmailVerify) => {
  await sendEmail(() => new OrganizationEmailVerification(sendOrgInput));
};

export const sendMonthlyDigestEmails = async (eventData: MonthlyDigestEmailData) => {
  await sendEmail(() => new MonthlyDigestEmail(eventData));
};

export const sendAdminOrganizationNotification = async (input: OrganizationNotification) => {
  await sendEmail(() => new AdminOrganizationNotification(input));
};

export const sendBookingRedirectNotification = async (bookingRedirect: IBookingRedirect) => {
  await sendEmail(() => new BookingRedirectEmailNotification(bookingRedirect));
};
