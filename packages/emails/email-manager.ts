// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import type { TFunction } from "next-i18next";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import type BaseEmail from "@calcom/emails/templates/_base-email";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import type { MonthlyDigestEmailData } from "./src/templates/MonthlyDigestEmail";
import type { EmailVerifyLink } from "./templates/account-verify-email";
import AccountVerifyEmail from "./templates/account-verify-email";
import type { OrganizationNotification } from "./templates/admin-organization-notification";
import AdminOrganizationNotification from "./templates/admin-organization-notification";
import AttendeeAwaitingPaymentEmail from "./templates/attendee-awaiting-payment-email";
import AttendeeCancelledEmail from "./templates/attendee-cancelled-email";
import AttendeeCancelledSeatEmail from "./templates/attendee-cancelled-seat-email";
import AttendeeDailyVideoDownloadRecordingEmail from "./templates/attendee-daily-video-download-recording-email";
import AttendeeDeclinedEmail from "./templates/attendee-declined-email";
import AttendeeLocationChangeEmail from "./templates/attendee-location-change-email";
import AttendeeRequestEmail from "./templates/attendee-request-email";
import AttendeeRescheduledEmail from "./templates/attendee-rescheduled-email";
import AttendeeScheduledEmail from "./templates/attendee-scheduled-email";
import type { EmailVerifyCode } from "./templates/attendee-verify-email";
import AttendeeVerifyEmail from "./templates/attendee-verify-email";
import AttendeeWasRequestedToRescheduleEmail from "./templates/attendee-was-requested-to-reschedule-email";
import BrokenIntegrationEmail from "./templates/broken-integration-email";
import DisabledAppEmail from "./templates/disabled-app-email";
import type { Feedback } from "./templates/feedback-email";
import FeedbackEmail from "./templates/feedback-email";
import type { PasswordReset } from "./templates/forgot-password-email";
import ForgotPasswordEmail from "./templates/forgot-password-email";
import MonthlyDigestEmail from "./templates/monthly-digest-email";
import NoShowFeeChargedEmail from "./templates/no-show-fee-charged-email";
import type { OrgAutoInvite } from "./templates/org-auto-join-invite";
import OrgAutoJoinEmail from "./templates/org-auto-join-invite";
import type { OrganizationEmailVerify } from "./templates/organization-email-verification";
import OrganizationEmailVerification from "./templates/organization-email-verification";
import OrganizerAttendeeCancelledSeatEmail from "./templates/organizer-attendee-cancelled-seat-email";
import OrganizerCancelledEmail from "./templates/organizer-cancelled-email";
import OrganizerDailyVideoDownloadRecordingEmail from "./templates/organizer-daily-video-download-recording-email";
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

export const sendScheduledEmails = async (
  calEvent: CalendarEvent,
  eventNameObject?: EventNameObjectType,
  hostEmailDisabled?: boolean,
  attendeeEmailDisabled?: boolean
) => {
  const emailsToSend: Promise<unknown>[] = [];

  if (!hostEmailDisabled) {
    emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent })));

    if (calEvent.team) {
      for (const teamMember of calEvent.team.members) {
        emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent, teamMember })));
      }
    }
  }

  if (!attendeeEmailDisabled) {
    emailsToSend.push(
      ...calEvent.attendees.map((attendee) => {
        return sendEmail(
          () =>
            new AttendeeScheduledEmail(
              {
                ...calEvent,
                ...(calEvent.hideCalendarNotes && { additionalNotes: undefined }),
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
};

// for rescheduled round robin booking that assigned new members
export const sendRoundRobinScheduledEmails = async (calEvent: CalendarEvent, members: Person[]) => {
  const emailsToSend: Promise<unknown>[] = [];

  for (const teamMember of members) {
    emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent, teamMember })));
  }

  await Promise.all(emailsToSend);
};

export const sendRoundRobinRescheduledEmails = async (calEvent: CalendarEvent, members: Person[]) => {
  const emailsToSend: Promise<unknown>[] = [];

  for (const teamMember of members) {
    emailsToSend.push(sendEmail(() => new OrganizerRescheduledEmail({ calEvent, teamMember })));
  }

  await Promise.all(emailsToSend);
};

export const sendRoundRobinCancelledEmails = async (calEvent: CalendarEvent, members: Person[]) => {
  const emailsToSend: Promise<unknown>[] = [];

  for (const teamMember of members) {
    emailsToSend.push(sendEmail(() => new OrganizerCancelledEmail({ calEvent, teamMember })));
  }

  await Promise.all(emailsToSend);
};

export const sendRescheduledEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerRescheduledEmail({ calEvent })));

  if (calEvent.team) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerRescheduledEmail({ calEvent, teamMember })));
    }
  }

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeRescheduledEmail(calEvent, attendee));
    })
  );

  await Promise.all(emailsToSend);
};

export const sendRescheduledSeatEmail = async (calEvent: CalendarEvent, attendee: Person) => {
  const clonedCalEvent = cloneDeep(calEvent);
  const emailsToSend: Promise<unknown>[] = [
    sendEmail(() => new AttendeeRescheduledEmail(clonedCalEvent, attendee)),
    sendEmail(() => new OrganizerRescheduledEmail({ calEvent })),
  ];

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
  const emailsToSend: Promise<unknown>[] = [];

  if (!hostEmailDisabled) {
    emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent, newSeat })));

    if (calEvent.team) {
      for (const teamMember of calEvent.team.members) {
        emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent, newSeat, teamMember })));
      }
    }
  }

  if (!attendeeEmailDisabled) {
    emailsToSend.push(
      sendEmail(
        () =>
          new AttendeeScheduledEmail(
            {
              ...calEvent,
              ...(calEvent.hideCalendarNotes && { additionalNotes: undefined }),
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
  const clonedCalEvent = cloneDeep(calEvent);
  await Promise.all([
    sendEmail(() => new AttendeeCancelledSeatEmail(clonedCalEvent, cancelledAttendee)),
    sendEmail(() => new OrganizerAttendeeCancelledSeatEmail({ calEvent })),
  ]);
};

export const sendOrganizerRequestEmail = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerRequestEmail({ calEvent })));

  if (calEvent.team?.members) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerRequestEmail({ calEvent, teamMember })));
    }
  }

  await Promise.all(emailsToSend);
};

export const sendAttendeeRequestEmail = async (calEvent: CalendarEvent, attendee: Person) => {
  await sendEmail(() => new AttendeeRequestEmail(calEvent, attendee));
};

export const sendDeclinedEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeDeclinedEmail(calEvent, attendee));
    })
  );

  await Promise.all(emailsToSend);
};

export const sendCancelledEmails = async (
  calEvent: CalendarEvent,
  eventNameObject: Pick<EventNameObjectType, "eventName">
) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerCancelledEmail({ calEvent })));

  if (calEvent.team?.members) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerCancelledEmail({ calEvent, teamMember })));
    }
  }

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(
        () =>
          new AttendeeCancelledEmail(
            {
              ...calEvent,
              title: getEventName({
                ...eventNameObject,
                t: attendee.language.translate,
                attendeeName: attendee.name,
                host: calEvent.organizer.name,
                eventType: calEvent.type,
                ...(calEvent.responses && { bookingFields: calEvent.responses }),
                ...(calEvent.location && { location: calEvent.location }),
              }),
            },
            attendee
          )
      );
    })
  );

  await Promise.all(emailsToSend);
};

export const sendOrganizerRequestReminderEmail = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerRequestReminderEmail({ calEvent })));

  if (calEvent.team?.members) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerRequestReminderEmail({ calEvent, teamMember })));
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

export const sendOrganizationAutoJoinEmail = async (orgInviteEvent: OrgAutoInvite) => {
  await sendEmail(() => new OrgAutoJoinEmail(orgInviteEvent));
};

export const sendEmailVerificationLink = async (verificationInput: EmailVerifyLink) => {
  await sendEmail(() => new AccountVerifyEmail(verificationInput));
};

export const sendEmailVerificationCode = async (verificationInput: EmailVerifyCode) => {
  await sendEmail(() => new AttendeeVerifyEmail(verificationInput));
};

export const sendRequestRescheduleEmail = async (
  calEvent: CalendarEvent,
  metadata: { rescheduleLink: string }
) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerRequestedToRescheduleEmail(calEvent, metadata)));

  emailsToSend.push(sendEmail(() => new AttendeeWasRequestedToRescheduleEmail(calEvent, metadata)));

  await Promise.all(emailsToSend);
};

export const sendLocationChangeEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerLocationChangeEmail({ calEvent })));

  if (calEvent.team?.members) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerLocationChangeEmail({ calEvent, teamMember })));
    }
  }

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeLocationChangeEmail(calEvent, attendee));
    })
  );

  await Promise.all(emailsToSend);
};
export const sendFeedbackEmail = async (feedback: Feedback) => {
  await sendEmail(() => new FeedbackEmail(feedback));
};

export const sendBrokenIntegrationEmail = async (evt: CalendarEvent, type: "video" | "calendar") => {
  await sendEmail(() => new BrokenIntegrationEmail(evt, type));
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
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerDailyVideoDownloadRecordingEmail(calEvent, downloadLink)));

  for (const attendee of calEvent.attendees) {
    emailsToSend.push(
      sendEmail(() => new AttendeeDailyVideoDownloadRecordingEmail(calEvent, attendee, downloadLink))
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
