import type { TFunction } from "next-i18next";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import type BaseEmail from "@calcom/emails/templates/_base-email";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import AttendeeAwaitingPaymentEmail from "./templates/attendee-awaiting-payment-email";
import AttendeeCancelledEmail from "./templates/attendee-cancelled-email";
import AttendeeDeclinedEmail from "./templates/attendee-declined-email";
import AttendeeLocationChangeEmail from "./templates/attendee-location-change-email";
import AttendeeRequestEmail from "./templates/attendee-request-email";
import AttendeeRescheduledEmail from "./templates/attendee-rescheduled-email";
import AttendeeScheduledEmail from "./templates/attendee-scheduled-email";
import AttendeeWasRequestedToRescheduleEmail from "./templates/attendee-was-requested-to-reschedule-email";
import BrokenIntegrationEmail from "./templates/broken-integration-email";
import DisabledAppEmail from "./templates/disabled-app-email";
import type { Feedback } from "./templates/feedback-email";
import FeedbackEmail from "./templates/feedback-email";
import type { PasswordReset } from "./templates/forgot-password-email";
import ForgotPasswordEmail from "./templates/forgot-password-email";
import OrganizerCancelledEmail from "./templates/organizer-cancelled-email";
import OrganizerLocationChangeEmail from "./templates/organizer-location-change-email";
import OrganizerPaymentRefundFailedEmail from "./templates/organizer-payment-refund-failed-email";
import OrganizerRequestEmail from "./templates/organizer-request-email";
import OrganizerRequestReminderEmail from "./templates/organizer-request-reminder-email";
import OrganizerRequestedToRescheduleEmail from "./templates/organizer-requested-to-reschedule-email";
import OrganizerRescheduledEmail from "./templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "./templates/organizer-scheduled-email";
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

export const sendScheduledEmails = async (calEvent: CalendarEvent, eventNameObject?: EventNameObjectType) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent })));

  if (calEvent.team) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent, teamMember })));
    }
  }

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(
        () =>
          new AttendeeScheduledEmail(
            {
              ...calEvent,
              ...(eventNameObject && {
                title: getEventName({ ...eventNameObject, t: attendee.language.translate }),
              }),
            },
            attendee
          )
      );
    })
  );

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

  // @TODO: we should obtain who is rescheduling the event and send them a different email
  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeRescheduledEmail(calEvent, attendee));
    })
  );

  await Promise.all(emailsToSend);
};

export const sendScheduledSeatsEmails = async (
  calEvent: CalendarEvent,
  invitee: Person,
  newSeat: boolean,
  showAttendees: boolean
) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent, newSeat })));

  if (calEvent.team) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent, newSeat, teamMember })));
    }
  }

  emailsToSend.push(sendEmail(() => new AttendeeScheduledEmail(calEvent, invitee, showAttendees)));

  await Promise.all(emailsToSend);
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

export const sendCancelledEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerCancelledEmail({ calEvent })));

  if (calEvent.team?.members) {
    for (const teamMember of calEvent.team.members) {
      emailsToSend.push(sendEmail(() => new OrganizerCancelledEmail({ calEvent, teamMember })));
    }
  }

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeCancelledEmail(calEvent, attendee));
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
