import type { CalendarEvent, Person, RecurringEvent } from "@calcom/types/Calendar";

import AttendeeAwaitingPaymentEmail from "@lib/emails/templates/attendee-awaiting-payment-email";
import AttendeeCancelledEmail from "@lib/emails/templates/attendee-cancelled-email";
import AttendeeDeclinedEmail from "@lib/emails/templates/attendee-declined-email";
import AttendeeRequestEmail from "@lib/emails/templates/attendee-request-email";
import AttendeeRequestRescheduledEmail from "@lib/emails/templates/attendee-request-reschedule-email";
import AttendeeRescheduledEmail from "@lib/emails/templates/attendee-rescheduled-email";
import AttendeeScheduledEmail from "@lib/emails/templates/attendee-scheduled-email";
import ForgotPasswordEmail, { PasswordReset } from "@lib/emails/templates/forgot-password-email";
import OrganizerCancelledEmail from "@lib/emails/templates/organizer-cancelled-email";
import OrganizerPaymentRefundFailedEmail from "@lib/emails/templates/organizer-payment-refund-failed-email";
import OrganizerRequestEmail from "@lib/emails/templates/organizer-request-email";
import OrganizerRequestReminderEmail from "@lib/emails/templates/organizer-request-reminder-email";
import OrganizerRequestRescheduleEmail from "@lib/emails/templates/organizer-request-reschedule-email";
import OrganizerRescheduledEmail from "@lib/emails/templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "@lib/emails/templates/organizer-scheduled-email";
import TeamInviteEmail, { TeamInvite } from "@lib/emails/templates/team-invite-email";

export const sendScheduledEmails = async (calEvent: CalendarEvent, recurringEvent: RecurringEvent = {}) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const scheduledEmail = new AttendeeScheduledEmail(calEvent, attendee, recurringEvent);
          resolve(scheduledEmail.sendEmail());
        } catch (e) {
          reject(console.error("AttendeeRescheduledEmail.sendEmail failed", e));
        }
      });
    })
  );

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const scheduledEmail = new OrganizerScheduledEmail(calEvent, recurringEvent);
        resolve(scheduledEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerScheduledEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};

export const sendRescheduledEmails = async (calEvent: CalendarEvent, recurringEvent: RecurringEvent = {}) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const scheduledEmail = new AttendeeRescheduledEmail(calEvent, attendee, recurringEvent);
          resolve(scheduledEmail.sendEmail());
        } catch (e) {
          reject(console.error("AttendeeRescheduledEmail.sendEmail failed", e));
        }
      });
    })
  );

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const scheduledEmail = new OrganizerRescheduledEmail(calEvent, recurringEvent);
        resolve(scheduledEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerScheduledEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};

export const sendOrganizerRequestEmail = async (
  calEvent: CalendarEvent,
  recurringEvent: RecurringEvent = {}
) => {
  await new Promise((resolve, reject) => {
    try {
      const organizerRequestEmail = new OrganizerRequestEmail(calEvent, recurringEvent);
      resolve(organizerRequestEmail.sendEmail());
    } catch (e) {
      reject(console.error("OrganizerRequestEmail.sendEmail failed", e));
    }
  });
};

export const sendAttendeeRequestEmail = async (
  calEvent: CalendarEvent,
  attendee: Person,
  recurringEvent: RecurringEvent = {}
) => {
  await new Promise((resolve, reject) => {
    try {
      const attendeeRequestEmail = new AttendeeRequestEmail(calEvent, attendee, recurringEvent);
      resolve(attendeeRequestEmail.sendEmail());
    } catch (e) {
      reject(console.error("AttendRequestEmail.sendEmail failed", e));
    }
  });
};

export const sendDeclinedEmails = async (calEvent: CalendarEvent, recurringEvent: RecurringEvent = {}) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const declinedEmail = new AttendeeDeclinedEmail(calEvent, attendee, recurringEvent);
          resolve(declinedEmail.sendEmail());
        } catch (e) {
          reject(console.error("AttendeeRescheduledEmail.sendEmail failed", e));
        }
      });
    })
  );

  await Promise.all(emailsToSend);
};

export const sendCancelledEmails = async (calEvent: CalendarEvent, recurringEvent: RecurringEvent = {}) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const scheduledEmail = new AttendeeCancelledEmail(calEvent, attendee, recurringEvent);
          resolve(scheduledEmail.sendEmail());
        } catch (e) {
          reject(console.error("AttendeeCancelledEmail.sendEmail failed", e));
        }
      });
    })
  );

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const scheduledEmail = new OrganizerCancelledEmail(calEvent, recurringEvent);
        resolve(scheduledEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerCancelledEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};

export const sendOrganizerRequestReminderEmail = async (
  calEvent: CalendarEvent,
  recurringEvent: RecurringEvent = {}
) => {
  await new Promise((resolve, reject) => {
    try {
      const organizerRequestReminderEmail = new OrganizerRequestReminderEmail(calEvent, recurringEvent);
      resolve(organizerRequestReminderEmail.sendEmail());
    } catch (e) {
      reject(console.error("OrganizerRequestReminderEmail.sendEmail failed", e));
    }
  });
};

export const sendAwaitingPaymentEmail = async (
  calEvent: CalendarEvent,
  recurringEvent: RecurringEvent = {}
) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const paymentEmail = new AttendeeAwaitingPaymentEmail(calEvent, attendee, recurringEvent);
          resolve(paymentEmail.sendEmail());
        } catch (e) {
          reject(console.error("AttendeeAwaitingPaymentEmail.sendEmail failed", e));
        }
      });
    })
  );

  await Promise.all(emailsToSend);
};

export const sendOrganizerPaymentRefundFailedEmail = async (
  calEvent: CalendarEvent,
  recurringEvent: RecurringEvent = {}
) => {
  await new Promise((resolve, reject) => {
    try {
      const paymentRefundFailedEmail = new OrganizerPaymentRefundFailedEmail(calEvent, recurringEvent);
      resolve(paymentRefundFailedEmail.sendEmail());
    } catch (e) {
      reject(console.error("OrganizerPaymentRefundFailedEmail.sendEmail failed", e));
    }
  });
};

export const sendPasswordResetEmail = async (passwordResetEvent: PasswordReset) => {
  await new Promise((resolve, reject) => {
    try {
      const passwordResetEmail = new ForgotPasswordEmail(passwordResetEvent);
      resolve(passwordResetEmail.sendEmail());
    } catch (e) {
      reject(console.error("OrganizerPaymentRefundFailedEmail.sendEmail failed", e));
    }
  });
};

export const sendTeamInviteEmail = async (teamInviteEvent: TeamInvite) => {
  await new Promise((resolve, reject) => {
    try {
      const teamInviteEmail = new TeamInviteEmail(teamInviteEvent);
      resolve(teamInviteEmail.sendEmail());
    } catch (e) {
      reject(console.error("TeamInviteEmail.sendEmail failed", e));
    }
  });
};

export const sendRequestRescheduleEmail = async (
  calEvent: CalendarEvent,
  metadata: { rescheduleLink: string },
  recurringEvent: RecurringEvent = {}
) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const requestRescheduleEmail = new AttendeeRequestRescheduledEmail(
          calEvent,
          metadata,
          recurringEvent
        );
        resolve(requestRescheduleEmail.sendEmail());
      } catch (e) {
        reject(console.error("AttendeeRequestRescheduledEmail.sendEmail failed", e));
      }
    })
  );

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const requestRescheduleEmail = new OrganizerRequestRescheduleEmail(
          calEvent,
          metadata,
          recurringEvent
        );
        resolve(requestRescheduleEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerRequestRescheduledEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};
