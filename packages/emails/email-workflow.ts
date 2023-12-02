// eslint-disable-next-line no-restricted-imports
import { proxyActivities } from "@temporalio/workflow";
import type { TFunction } from "next-i18next";

import type { EventNameObjectType } from "@calcom/core/event";
import type * as activities from "@calcom/emails/email-manager";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import type { MonthlyDigestEmailData } from "./src/templates/MonthlyDigestEmail";
import type { EmailVerifyLink } from "./templates/account-verify-email";
import type { OrganizationNotification } from "./templates/admin-organization-notification";
import type { EmailVerifyCode } from "./templates/attendee-verify-email";
import type { Feedback } from "./templates/feedback-email";
import type { PasswordReset } from "./templates/forgot-password-email";
import type { OrgAutoInvite } from "./templates/org-auto-join-invite";
import type { OrganizationEmailVerify } from "./templates/organization-email-verification";
import type { TeamInvite } from "./templates/team-invite-email";

const emailActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: "3 minutes",
});

/* Consideration: For some email workflows (e.g. sendScheduledEmails), it might make sense to re-write them for a better experience and better retry logic. For now, we are just going to use the existing functions which works well as-is.
 */

export const sendScheduledEmails = async ({
  data,
}: {
  data: {
    calEvent: CalendarEvent;
    eventNameObject?: EventNameObjectType;
    hostEmailDisabled?: boolean;
    attendeeEmailDisabled?: boolean;
  };
}) => {
  return await emailActivities.sendScheduledEmails(
    data.calEvent,
    data.eventNameObject,
    data.hostEmailDisabled,
    data.attendeeEmailDisabled
  );
};

// for rescheduled round robin booking that assigned new members
export const sendRoundRobinScheduledEmails = async ({
  data,
}: {
  data: { calEvent: CalendarEvent; members: Person[] };
}) => {
  return emailActivities.sendRoundRobinScheduledEmails(data.calEvent, data.members);
};

export const sendRoundRobinRescheduledEmails = async ({
  data,
}: {
  data: { calEvent: CalendarEvent; members: Person[] };
}) => {
  return emailActivities.sendRoundRobinRescheduledEmails(data.calEvent, data.members);
};

export const sendRoundRobinCancelledEmails = async ({
  data,
}: {
  data: { calEvent: CalendarEvent; members: Person[] };
}) => {
  return emailActivities.sendRoundRobinCancelledEmails(data.calEvent, data.members);
};

export const sendRescheduledEmails = async ({ data }: { data: { calEvent: CalendarEvent } }) => {
  return await emailActivities.sendRescheduledEmails(data.calEvent);
};

export const sendRescheduledSeatEmail = async ({
  data,
}: {
  data: { calEvent: CalendarEvent; attendee: Person };
}) => {
  return await emailActivities.sendRescheduledSeatEmail(data.calEvent, data.attendee);
};

export const sendScheduledSeatsEmails = async ({
  data,
}: {
  data: {
    calEvent: CalendarEvent;
    invitee: Person;
    newSeat: boolean;
    showAttendees: boolean;
    hostEmailDisabled?: boolean;
    attendeeEmailDisabled?: boolean;
  };
}) => {
  return await emailActivities.sendScheduledSeatsEmails(
    data.calEvent,
    data.invitee,
    data.newSeat,
    data.showAttendees,
    data.hostEmailDisabled,
    data.attendeeEmailDisabled
  );
};

export const sendCancelledSeatEmails = async ({
  data,
}: {
  data: { calEvent: CalendarEvent; cancelledAttendee: Person };
}) => {
  return await emailActivities.sendCancelledSeatEmails(data.calEvent, data.cancelledAttendee);
};

export const sendOrganizerRequestEmail = async ({ data }: { data: { calEvent: CalendarEvent } }) => {
  return await emailActivities.sendOrganizerRequestEmail(data.calEvent);
};

export const sendAttendeeRequestEmail = async ({
  data,
}: {
  data: { calEvent: CalendarEvent; attendee: Person };
}) => {
  return await emailActivities.sendAttendeeRequestEmail(data.calEvent, data.attendee);
};

export const sendDeclinedEmails = async ({ data: { calEvent } }: { data: { calEvent: CalendarEvent } }) => {
  return await emailActivities.sendDeclinedEmails(calEvent);
};

export const sendCancelledEmails = async ({
  data: { calEvent, eventNameObject },
}: {
  data: { calEvent: CalendarEvent; eventNameObject: Pick<EventNameObjectType, "eventName"> };
}) => {
  return await emailActivities.sendCancelledEmails(calEvent, eventNameObject);
};

export const sendOrganizerRequestReminderEmail = async ({ data }: { data: { calEvent: CalendarEvent } }) => {
  return await emailActivities.sendOrganizerRequestReminderEmail(data.calEvent);
};

export const sendAwaitingPaymentEmail = async ({
  data: { calEvent },
}: {
  data: { calEvent: CalendarEvent };
}) => {
  return await emailActivities.sendAwaitingPaymentEmail(calEvent);
};

export const sendOrganizerPaymentRefundFailedEmail = async ({
  data: { calEvent },
}: {
  data: { calEvent: CalendarEvent };
}) => {
  return await emailActivities.sendOrganizerPaymentRefundFailedEmail(calEvent);
};

export const sendPasswordResetEmail = async ({ data }: { data: { passwordResetEvent: PasswordReset } }) => {
  return await emailActivities.sendPasswordResetEmail(data.passwordResetEvent);
};

export const sendTeamInviteEmail = async ({ data }: { data: { teamInviteEvent: TeamInvite } }) => {
  return await emailActivities.sendTeamInviteEmail(data.teamInviteEvent);
};

export const sendOrganizationAutoJoinEmail = async ({
  data,
}: {
  data: { orgInviteEvent: OrgAutoInvite };
}) => {
  return await emailActivities.sendOrganizationAutoJoinEmail(data.orgInviteEvent);
};

export const sendEmailVerificationLink = async ({
  data,
}: {
  data: { verificationInput: EmailVerifyLink };
}) => {
  return await emailActivities.sendEmailVerificationLink(data.verificationInput);
};

export const sendEmailVerificationCode = async ({
  data,
}: {
  data: { verificationInput: EmailVerifyCode };
}) => {
  return await emailActivities.sendEmailVerificationCode(data.verificationInput);
};

export const sendRequestRescheduleEmail = async ({
  data,
}: {
  data: { calEvent: CalendarEvent; metadata: { rescheduleLink: string } };
}) => {
  return await emailActivities.sendRequestRescheduleEmail(data.calEvent, data.metadata);
};

export const sendLocationChangeEmails = async ({
  data: { calEvent },
}: {
  data: { calEvent: CalendarEvent };
}) => {
  return await emailActivities.sendLocationChangeEmails(calEvent);
};
export const sendFeedbackEmail = async ({ data }: { data: { feedback: Feedback } }) => {
  return await emailActivities.sendFeedbackEmail(data.feedback);
};

export const sendBrokenIntegrationEmail = async ({
  data,
}: {
  data: { evt: CalendarEvent; type: "video" | "calendar" };
}) => {
  return await emailActivities.sendBrokenIntegrationEmail(data.evt, data.type);
};

export const sendDisabledAppEmail = async ({
  data,
}: {
  data: {
    email: string;
    appName: string;
    appType: string[];
    t: TFunction;
    title?: string;
    eventTypeId?: number;
  };
}) => {
  return await emailActivities.sendDisabledAppEmail(data);
};

export const sendSlugReplacementEmail = async ({
  data,
}: {
  data: {
    email: string;
    name: string;
    teamName: string | null;
    t: TFunction;
    slug: string;
  };
}) => {
  return await emailActivities.sendSlugReplacementEmail(data);
};

export const sendNoShowFeeChargedEmail = async ({
  data,
}: {
  data: { attendee: Person; evt: CalendarEvent };
}) => {
  return await emailActivities.sendNoShowFeeChargedEmail(data.attendee, data.evt);
};

export const sendDailyVideoRecordingEmails = async ({
  data: { calEvent, downloadLink },
}: {
  data: { calEvent: CalendarEvent; downloadLink: string };
}) => {
  return await emailActivities.sendDailyVideoRecordingEmails(calEvent, downloadLink);
};

export const sendOrganizationEmailVerification = async ({
  data: { sendOrgInput },
}: {
  data: { sendOrgInput: OrganizationEmailVerify };
}) => {
  return await emailActivities.sendOrganizationEmailVerification(sendOrgInput);
};

export const sendMonthlyDigestEmails = async ({
  data: { eventData },
}: {
  data: { eventData: MonthlyDigestEmailData };
}) => {
  return await emailActivities.sendMonthlyDigestEmails(eventData);
};

export const sendAdminOrganizationNotification = async ({
  data: { input },
}: {
  data: { input: OrganizationNotification };
}) => {
  return await emailActivities.sendAdminOrganizationNotification(input);
};
