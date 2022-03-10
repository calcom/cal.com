import AttendeeAwaitingPaymentEmail from "@calcom/lib/emails/templates/attendee-awaiting-payment-email";
import AttendeeCancelledEmail from "@calcom/lib/emails/templates/attendee-cancelled-email";
import AttendeeDeclinedEmail from "@calcom/lib/emails/templates/attendee-declined-email";
import AttendeeRequestEmail from "@calcom/lib/emails/templates/attendee-request-email";
import AttendeeRescheduledEmail from "@calcom/lib/emails/templates/attendee-rescheduled-email";
import AttendeeScheduledEmail from "@calcom/lib/emails/templates/attendee-scheduled-email";
import ForgotPasswordEmail, { PasswordReset } from "@calcom/lib/emails/templates/forgot-password-email";
import OrganizerCancelledEmail from "@calcom/lib/emails/templates/organizer-cancelled-email";
import OrganizerPaymentRefundFailedEmail from "@calcom/lib/emails/templates/organizer-payment-refund-failed-email";
import OrganizerRequestEmail from "@calcom/lib/emails/templates/organizer-request-email";
import OrganizerRequestReminderEmail from "@calcom/lib/emails/templates/organizer-request-reminder-email";
import OrganizerRescheduledEmail from "@calcom/lib/emails/templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "@calcom/lib/emails/templates/organizer-scheduled-email";
import TeamInviteEmail, { TeamInvite } from "@calcom/lib/emails/templates/team-invite-email";
import { CalendarEvent, Person } from "@calcom/lib/integrations/calendar/interfaces/Calendar";

export const sendScheduledEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const scheduledEmail = new AttendeeScheduledEmail(calEvent, attendee);
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
        const scheduledEmail = new OrganizerScheduledEmail(calEvent);
        resolve(scheduledEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerScheduledEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};

export const sendRescheduledEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const scheduledEmail = new AttendeeRescheduledEmail(calEvent, attendee);
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
        const scheduledEmail = new OrganizerRescheduledEmail(calEvent);
        resolve(scheduledEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerScheduledEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};

export const sendOrganizerRequestEmail = async (calEvent: CalendarEvent) => {
  await new Promise((resolve, reject) => {
    try {
      const organizerRequestEmail = new OrganizerRequestEmail(calEvent);
      resolve(organizerRequestEmail.sendEmail());
    } catch (e) {
      reject(console.error("OrganizerRequestEmail.sendEmail failed", e));
    }
  });
};

export const sendAttendeeRequestEmail = async (calEvent: CalendarEvent, attendee: Person) => {
  await new Promise((resolve, reject) => {
    try {
      const attendeeRequestEmail = new AttendeeRequestEmail(calEvent, attendee);
      resolve(attendeeRequestEmail.sendEmail());
    } catch (e) {
      reject(console.error("AttendRequestEmail.sendEmail failed", e));
    }
  });
};

export const sendDeclinedEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const declinedEmail = new AttendeeDeclinedEmail(calEvent, attendee);
          resolve(declinedEmail.sendEmail());
        } catch (e) {
          reject(console.error("AttendeeRescheduledEmail.sendEmail failed", e));
        }
      });
    })
  );

  await Promise.all(emailsToSend);
};

export const sendCancelledEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const scheduledEmail = new AttendeeCancelledEmail(calEvent, attendee);
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
        const scheduledEmail = new OrganizerCancelledEmail(calEvent);
        resolve(scheduledEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerCancelledEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};

export const sendOrganizerRequestReminderEmail = async (calEvent: CalendarEvent) => {
  await new Promise((resolve, reject) => {
    try {
      const organizerRequestReminderEmail = new OrganizerRequestReminderEmail(calEvent);
      resolve(organizerRequestReminderEmail.sendEmail());
    } catch (e) {
      reject(console.error("OrganizerRequestReminderEmail.sendEmail failed", e));
    }
  });
};

export const sendAwaitingPaymentEmail = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const paymentEmail = new AttendeeAwaitingPaymentEmail(calEvent, attendee);
          resolve(paymentEmail.sendEmail());
        } catch (e) {
          reject(console.error("AttendeeAwaitingPaymentEmail.sendEmail failed", e));
        }
      });
    })
  );

  await Promise.all(emailsToSend);
};

export const sendOrganizerPaymentRefundFailedEmail = async (calEvent: CalendarEvent) => {
  await new Promise((resolve, reject) => {
    try {
      const paymentRefundFailedEmail = new OrganizerPaymentRefundFailedEmail(calEvent);
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
