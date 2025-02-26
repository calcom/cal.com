// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import type { TFunction } from "next-i18next";
import type { z } from "zod";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import type BaseEmail from "@calcom/emails/templates/_base-email";
import { formatCalEvent } from "@calcom/lib/formatCalendarEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import AwaitingPaymentSMS from "../sms/attendee/awaiting-payment-sms";
import CancelledSeatSMS from "../sms/attendee/cancelled-seat-sms";
import EventCancelledSMS from "../sms/attendee/event-cancelled-sms";
import EventDeclinedSMS from "../sms/attendee/event-declined-sms";
import EventLocationChangedSMS from "../sms/attendee/event-location-changed-sms";
import EventRequestSMS from "../sms/attendee/event-request-sms";
import EventRequestToRescheduleSMS from "../sms/attendee/event-request-to-reschedule-sms";
import EventSuccessfullyReScheduledSMS from "../sms/attendee/event-rescheduled-sms";
import EventSuccessfullyScheduledSMS from "../sms/attendee/event-scheduled-sms";
import type { MonthlyDigestEmailData } from "./src/templates/MonthlyDigestEmail";
import type { OrganizationAdminNoSlotsEmailInput } from "./src/templates/OrganizationAdminNoSlots";
import type { EmailVerifyLink } from "./templates/account-verify-email";
import AccountVerifyEmail from "./templates/account-verify-email";
import type { OrganizationNotification } from "./templates/admin-organization-notification";
import AdminOrganizationNotification from "./templates/admin-organization-notification";
import AttendeeAddGuestsEmail from "./templates/attendee-add-guests-email";
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
import AttendeeUpdatedEmail from "./templates/attendee-updated-email";
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
import OrganizerAddGuestsEmail from "./templates/organizer-add-guests-email";
import OrganizerAttendeeCancelledSeatEmail from "./templates/organizer-attendee-cancelled-seat-email";
import OrganizerCancelledEmail from "./templates/organizer-cancelled-email";
import OrganizerDailyVideoDownloadRecordingEmail from "./templates/organizer-daily-video-download-recording-email";
import OrganizerDailyVideoDownloadTranscriptEmail from "./templates/organizer-daily-video-download-transcript-email";
import OrganizerLocationChangeEmail from "./templates/organizer-location-change-email";
import OrganizerPaymentRefundFailedEmail from "./templates/organizer-payment-refund-failed-email";
import OrganizerReassignedEmail from "./templates/organizer-reassigned-email";
import OrganizerRequestEmail from "./templates/organizer-request-email";
import OrganizerRequestReminderEmail from "./templates/organizer-request-reminder-email";
import OrganizerRequestedToRescheduleEmail from "./templates/organizer-requested-to-reschedule-email";
import OrganizerRescheduledEmail from "./templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "./templates/organizer-scheduled-email";
import SlugReplacementEmail from "./templates/slug-replacement-email";
import type { TeamInvite } from "./templates/team-invite-email";
import TeamInviteEmail from "./templates/team-invite-email";

type EventTypeMetadata = z.infer<typeof EventTypeMetaDataSchema>;

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

const eventTypeDisableAttendeeEmail = (metadata?: EventTypeMetadata) => {
  return !!metadata?.disableStandardEmails?.all?.attendee;
};

const eventTypeDisableHostEmail = (metadata?: EventTypeMetadata) => {
  return !!metadata?.disableStandardEmails?.all?.host;
};

export const sendScheduledEmailsAndSMS = async (
  calEvent: CalendarEvent,
  eventNameObject?: EventNameObjectType,
  hostEmailDisabled?: boolean,
  attendeeEmailDisabled?: boolean,
  eventTypeMetadata?: EventTypeMetadata
) => {
  const formattedCalEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  if (!hostEmailDisabled && !eventTypeDisableHostEmail(eventTypeMetadata)) {
    emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent: formattedCalEvent })));

    if (formattedCalEvent.team) {
      for (const teamMember of formattedCalEvent.team.members) {
        emailsToSend.push(
          sendEmail(() => new OrganizerScheduledEmail({ calEvent: formattedCalEvent, teamMember }))
        );
      }
    }
  }

  if (!attendeeEmailDisabled && !eventTypeDisableAttendeeEmail(eventTypeMetadata)) {
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
export const sendRoundRobinScheduledEmailsAndSMS = async ({
  calEvent,
  members,
  eventTypeMetadata,
  reassigned,
}: {
  calEvent: CalendarEvent;
  members: Person[];
  eventTypeMetadata?: EventTypeMetadata;
  reassigned?: { name: string | null; email: string; reason?: string; byUser?: string };
}) => {
  if (eventTypeDisableHostEmail(eventTypeMetadata)) return;
  const formattedCalEvent = formatCalEvent(calEvent);
  const emailsAndSMSToSend: Promise<unknown>[] = [];
  const eventScheduledSMS = new EventSuccessfullyScheduledSMS(calEvent);

  for (const teamMember of members) {
    emailsAndSMSToSend.push(
      sendEmail(() => new OrganizerScheduledEmail({ calEvent: formattedCalEvent, teamMember, reassigned }))
    );
    if (teamMember.phoneNumber) {
      emailsAndSMSToSend.push(eventScheduledSMS.sendSMSToAttendee(teamMember));
    }
  }

  await Promise.all(emailsAndSMSToSend);
};

export const sendRoundRobinRescheduledEmailsAndSMS = async (
  calEvent: CalendarEvent,
  teamMembersAndAttendees: Person[],
  eventTypeMetadata?: EventTypeMetadata
) => {
  if (eventTypeDisableHostEmail(eventTypeMetadata)) return;

  const calendarEvent = formatCalEvent(calEvent);
  const emailsAndSMSToSend: Promise<unknown>[] = [];
  const successfullyReScheduledSMS = new EventSuccessfullyReScheduledSMS(calEvent);

  for (const person of teamMembersAndAttendees) {
    emailsAndSMSToSend.push(
      sendEmail(() => new OrganizerRescheduledEmail({ calEvent: calendarEvent, teamMember: person }))
    );
    if (person.phoneNumber) {
      emailsAndSMSToSend.push(successfullyReScheduledSMS.sendSMSToAttendee(person));
    }
  }

  await Promise.all(emailsAndSMSToSend);
};

export const sendRoundRobinUpdatedEmailsAndSMS = async ({
  calEvent,
  eventTypeMetadata,
}: {
  calEvent: CalendarEvent;
  eventTypeMetadata?: EventTypeMetadata;
}) => {
  if (eventTypeDisableAttendeeEmail(eventTypeMetadata)) return;

  const emailsToSend = calEvent.attendees.map((attendee) =>
    sendEmail(() => new AttendeeUpdatedEmail(calEvent, attendee))
  );

  await Promise.all(emailsToSend);
};

export const sendRoundRobinCancelledEmailsAndSMS = async (
  calEvent: CalendarEvent,
  members: Person[],
  eventTypeMetadata?: EventTypeMetadata,
  reassignedTo?: { name: string | null; email: string }
) => {
  if (eventTypeDisableHostEmail(eventTypeMetadata)) return;
  const calendarEvent = formatCalEvent(calEvent);
  const emailsAndSMSToSend: Promise<unknown>[] = [];
  const successfullyReScheduledSMS = new EventCancelledSMS(calEvent);
  for (const teamMember of members) {
    if (!reassignedTo) {
      emailsAndSMSToSend.push(
        sendEmail(() => new OrganizerCancelledEmail({ calEvent: calendarEvent, teamMember }))
      );
    } else {
      emailsAndSMSToSend.push(
        sendEmail(
          () =>
            new OrganizerReassignedEmail({ calEvent: calendarEvent, teamMember, reassigned: reassignedTo })
        )
      );
    }

    if (teamMember.phoneNumber) {
      emailsAndSMSToSend.push(successfullyReScheduledSMS.sendSMSToAttendee(teamMember));
    }
  }

  await Promise.all(emailsAndSMSToSend);
};

export const sendRescheduledEmailsAndSMS = async (
  calEvent: CalendarEvent,
  eventTypeMetadata?: EventTypeMetadata
) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  if (!eventTypeDisableHostEmail(eventTypeMetadata)) {
    emailsToSend.push(sendEmail(() => new OrganizerRescheduledEmail({ calEvent: calendarEvent })));

    if (calendarEvent.team) {
      for (const teamMember of calendarEvent.team.members) {
        emailsToSend.push(
          sendEmail(() => new OrganizerRescheduledEmail({ calEvent: calendarEvent, teamMember }))
        );
      }
    }
  }

  if (!eventTypeDisableAttendeeEmail(eventTypeMetadata)) {
    emailsToSend.push(
      ...calendarEvent.attendees.map((attendee) => {
        return sendEmail(() => new AttendeeRescheduledEmail(calendarEvent, attendee));
      })
    );
  }

  await Promise.all(emailsToSend);
  const successfullyReScheduledSms = new EventSuccessfullyReScheduledSMS(calEvent);
  await successfullyReScheduledSms.sendSMSToAttendees();
};

export const sendRescheduledSeatEmailAndSMS = async (
  calEvent: CalendarEvent,
  attendee: Person,
  eventTypeMetadata?: EventTypeMetadata
) => {
  const calendarEvent = formatCalEvent(calEvent);

  const clonedCalEvent = cloneDeep(calendarEvent);
  const emailsToSend: Promise<unknown>[] = [];

  if (!eventTypeDisableHostEmail(eventTypeMetadata))
    emailsToSend.push(sendEmail(() => new OrganizerRescheduledEmail({ calEvent: calendarEvent })));
  if (!eventTypeDisableAttendeeEmail(eventTypeMetadata))
    emailsToSend.push(sendEmail(() => new AttendeeRescheduledEmail(clonedCalEvent, attendee)));

  const successfullyReScheduledSMS = new EventSuccessfullyReScheduledSMS(calEvent);
  await successfullyReScheduledSMS.sendSMSToAttendee(attendee);

  await Promise.all(emailsToSend);
};

export const sendScheduledSeatsEmailsAndSMS = async (
  calEvent: CalendarEvent,
  invitee: Person,
  newSeat: boolean,
  showAttendees: boolean,
  hostEmailDisabled?: boolean,
  attendeeEmailDisabled?: boolean,
  eventTypeMetadata?: EventTypeMetadata
) => {
  const calendarEvent = formatCalEvent(calEvent);

  const emailsToSend: Promise<unknown>[] = [];

  if (!hostEmailDisabled && !eventTypeDisableHostEmail(eventTypeMetadata)) {
    emailsToSend.push(sendEmail(() => new OrganizerScheduledEmail({ calEvent: calendarEvent, newSeat })));

    if (calendarEvent.team) {
      for (const teamMember of calendarEvent.team.members) {
        emailsToSend.push(
          sendEmail(() => new OrganizerScheduledEmail({ calEvent: calendarEvent, newSeat, teamMember }))
        );
      }
    }
  }

  if (!attendeeEmailDisabled && !eventTypeDisableAttendeeEmail(eventTypeMetadata)) {
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
  const eventScheduledSMS = new EventSuccessfullyScheduledSMS(calendarEvent);
  await eventScheduledSMS.sendSMSToAttendee(invitee);
};

export const sendCancelledSeatEmailsAndSMS = async (
  calEvent: CalendarEvent,
  cancelledAttendee: Person,
  eventTypeMetadata?: EventTypeMetadata
) => {
  const formattedCalEvent = formatCalEvent(calEvent);
  const clonedCalEvent = cloneDeep(formattedCalEvent);
  const emailsToSend: Promise<unknown>[] = [];

  if (!eventTypeDisableAttendeeEmail(eventTypeMetadata))
    emailsToSend.push(sendEmail(() => new AttendeeCancelledSeatEmail(clonedCalEvent, cancelledAttendee)));
  if (!eventTypeDisableHostEmail(eventTypeMetadata))
    emailsToSend.push(
      sendEmail(() => new OrganizerAttendeeCancelledSeatEmail({ calEvent: formattedCalEvent }))
    );

  await Promise.all(emailsToSend);
  const cancelledSeatSMS = new CancelledSeatSMS(clonedCalEvent);
  await cancelledSeatSMS.sendSMSToAttendee(cancelledAttendee);
};

export const sendOrganizerRequestEmail = async (
  calEvent: CalendarEvent,
  eventTypeMetadata?: EventTypeMetadata
) => {
  if (eventTypeDisableHostEmail(eventTypeMetadata)) return;
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

export const sendAttendeeRequestEmailAndSMS = async (
  calEvent: CalendarEvent,
  attendee: Person,
  eventTypeMetadata?: EventTypeMetadata
) => {
  if (eventTypeDisableAttendeeEmail(eventTypeMetadata)) return;

  const calendarEvent = formatCalEvent(calEvent);
  await sendEmail(() => new AttendeeRequestEmail(calendarEvent, attendee));
  const eventRequestSms = new EventRequestSMS(calendarEvent);
  await eventRequestSms.sendSMSToAttendee(attendee);
};

export const sendDeclinedEmailsAndSMS = async (
  calEvent: CalendarEvent,
  eventTypeMetadata?: EventTypeMetadata
) => {
  if (eventTypeDisableAttendeeEmail(eventTypeMetadata)) return;

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
  eventNameObject: Pick<EventNameObjectType, "eventName">,
  eventTypeMetadata?: EventTypeMetadata
) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];
  const calEventLength = calendarEvent.length;
  const eventDuration = calEventLength as number;

  if (typeof calEventLength !== "number") {
    logger.error(
      "`calEventLength` is not a number",
      safeStringify({ calEventLength, calEventTitle: calEvent.title, bookingId: calEvent.bookingId })
    );
  }

  if (!eventTypeDisableHostEmail(eventTypeMetadata)) {
    emailsToSend.push(sendEmail(() => new OrganizerCancelledEmail({ calEvent: calendarEvent })));

    if (calendarEvent.team?.members) {
      for (const teamMember of calendarEvent.team.members) {
        emailsToSend.push(
          sendEmail(() => new OrganizerCancelledEmail({ calEvent: calendarEvent, teamMember }))
        );
      }
    }
  }

  if (!eventTypeDisableAttendeeEmail(eventTypeMetadata)) {
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
                  eventType: calendarEvent.title,
                  eventDuration,
                  ...(calendarEvent.responses && { bookingFields: calendarEvent.responses }),
                  ...(calendarEvent.location && { location: calendarEvent.location }),
                }),
              },
              attendee
            )
        );
      })
    );
  }

  await Promise.all(emailsToSend);
  const eventCancelledSms = new EventCancelledSMS(calEvent);
  await eventCancelledSms.sendSMSToAttendees();
};

export const sendOrganizerRequestReminderEmail = async (
  calEvent: CalendarEvent,
  eventTypeMetadata?: EventTypeMetadata
) => {
  if (eventTypeDisableHostEmail(eventTypeMetadata)) return;
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

export const sendAwaitingPaymentEmailAndSMS = async (
  calEvent: CalendarEvent,
  eventTypeMetadata?: EventTypeMetadata
) => {
  if (eventTypeDisableAttendeeEmail(eventTypeMetadata)) return;
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return sendEmail(() => new AttendeeAwaitingPaymentEmail(calEvent, attendee));
    })
  );
  await Promise.all(emailsToSend);
  const awaitingPaymentSMS = new AwaitingPaymentSMS(calEvent);
  await awaitingPaymentSMS.sendSMSToAttendees();
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

export const sendRequestRescheduleEmailAndSMS = async (
  calEvent: CalendarEvent,
  metadata: { rescheduleLink: string },
  eventTypeMetadata?: EventTypeMetadata
) => {
  const emailsToSend: Promise<unknown>[] = [];
  const calendarEvent = formatCalEvent(calEvent);

  if (!eventTypeDisableHostEmail(eventTypeMetadata)) {
    emailsToSend.push(sendEmail(() => new OrganizerRequestedToRescheduleEmail(calendarEvent, metadata)));
  }
  if (!eventTypeDisableAttendeeEmail(eventTypeMetadata)) {
    emailsToSend.push(sendEmail(() => new AttendeeWasRequestedToRescheduleEmail(calendarEvent, metadata)));
  }

  await Promise.all(emailsToSend);
  const eventRequestToReschedule = new EventRequestToRescheduleSMS(calendarEvent);
  await eventRequestToReschedule.sendSMSToAttendees();
};

export const sendLocationChangeEmailsAndSMS = async (
  calEvent: CalendarEvent,
  eventTypeMetadata?: EventTypeMetadata
) => {
  const calendarEvent = formatCalEvent(calEvent);

  const emailsToSend: Promise<unknown>[] = [];

  if (!eventTypeDisableHostEmail(eventTypeMetadata)) {
    emailsToSend.push(sendEmail(() => new OrganizerLocationChangeEmail({ calEvent: calendarEvent })));

    if (calendarEvent.team?.members) {
      for (const teamMember of calendarEvent.team.members) {
        emailsToSend.push(
          sendEmail(() => new OrganizerLocationChangeEmail({ calEvent: calendarEvent, teamMember }))
        );
      }
    }
  }

  if (!eventTypeDisableAttendeeEmail(eventTypeMetadata)) {
    emailsToSend.push(
      ...calendarEvent.attendees.map((attendee) => {
        return sendEmail(() => new AttendeeLocationChangeEmail(calendarEvent, attendee));
      })
    );
  }

  await Promise.all(emailsToSend);
  const eventLocationChangedSMS = new EventLocationChangedSMS(calendarEvent);
  await eventLocationChangedSMS.sendSMSToAttendees();
};
export const sendAddGuestsEmails = async (calEvent: CalendarEvent, newGuests: string[]) => {
  const calendarEvent = formatCalEvent(calEvent);

  const emailsToSend: Promise<unknown>[] = [];
  emailsToSend.push(sendEmail(() => new OrganizerAddGuestsEmail({ calEvent: calendarEvent })));

  if (calendarEvent.team?.members) {
    for (const teamMember of calendarEvent.team.members) {
      emailsToSend.push(
        sendEmail(() => new OrganizerAddGuestsEmail({ calEvent: calendarEvent, teamMember }))
      );
    }
  }

  emailsToSend.push(
    ...calendarEvent.attendees.map((attendee) => {
      if (newGuests.includes(attendee.email)) {
        return sendEmail(() => new AttendeeScheduledEmail(calendarEvent, attendee));
      } else {
        return sendEmail(() => new AttendeeAddGuestsEmail(calendarEvent, attendee));
      }
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

export const sendNoShowFeeChargedEmail = async (
  attendee: Person,
  evt: CalendarEvent,
  eventTypeMetadata?: EventTypeMetadata
) => {
  if (eventTypeDisableAttendeeEmail(eventTypeMetadata)) return;
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
