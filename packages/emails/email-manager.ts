import { TFunction } from "next-i18next";

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
import FeedbackEmail, { Feedback } from "./templates/feedback-email";
import ForgotPasswordEmail, { PasswordReset } from "./templates/forgot-password-email";
import OrganizerCancelledEmail from "./templates/organizer-cancelled-email";
import OrganizerLocationChangeEmail from "./templates/organizer-location-change-email";
import OrganizerPaymentRefundFailedEmail from "./templates/organizer-payment-refund-failed-email";
import OrganizerRequestEmail from "./templates/organizer-request-email";
import OrganizerRequestReminderEmail from "./templates/organizer-request-reminder-email";
import OrganizerRequestedToRescheduleEmail from "./templates/organizer-requested-to-reschedule-email";
import OrganizerRescheduledEmail from "./templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "./templates/organizer-scheduled-email";
import TeamInviteEmail, { TeamInvite } from "./templates/team-invite-email";

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
  // @TODO: we should obtain who is rescheduling the event and send them a different email
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
        reject(console.error("OrganizerRescheduledEmail.sendEmail failed", e));
      }
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

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const scheduledEmail = new AttendeeScheduledEmail(calEvent, invitee, showAttendees);
        resolve(scheduledEmail.sendEmail());
      } catch (e) {
        reject(console.error("AttendeeScheduledEmail.sendEmail failed", e));
      }
    })
  );

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const scheduledEmail = new OrganizerScheduledEmail(calEvent, newSeat);
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

export const sendRequestRescheduleEmail = async (
  calEvent: CalendarEvent,
  metadata: { rescheduleLink: string }
) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const requestRescheduleEmail = new AttendeeWasRequestedToRescheduleEmail(calEvent, metadata);
        resolve(requestRescheduleEmail.sendEmail());
      } catch (e) {
        reject(console.error("AttendeeWasRequestedToRescheduleEmail.sendEmail failed", e));
      }
    })
  );

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const requestRescheduleEmail = new OrganizerRequestedToRescheduleEmail(calEvent, metadata);
        resolve(requestRescheduleEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerRequestedToRescheduleEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};

export const sendLocationChangeEmails = async (calEvent: CalendarEvent) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    ...calEvent.attendees.map((attendee) => {
      return new Promise((resolve, reject) => {
        try {
          const scheduledEmail = new AttendeeLocationChangeEmail(calEvent, attendee);
          resolve(scheduledEmail.sendEmail());
        } catch (e) {
          reject(console.error("AttendeeLocationChangeEmail.sendEmail failed", e));
        }
      });
    })
  );

  emailsToSend.push(
    new Promise((resolve, reject) => {
      try {
        const scheduledEmail = new OrganizerLocationChangeEmail(calEvent);
        resolve(scheduledEmail.sendEmail());
      } catch (e) {
        reject(console.error("OrganizerLocationChangeEmail.sendEmail failed", e));
      }
    })
  );

  await Promise.all(emailsToSend);
};
export const sendFeedbackEmail = async (feedback: Feedback) => {
  await new Promise((resolve, reject) => {
    try {
      const feedbackEmail = new FeedbackEmail(feedback);
      resolve(feedbackEmail.sendEmail());
    } catch (e) {
      reject(console.error("FeedbackEmail.sendEmail failed", e));
    }
  });
};

export const sendBrokenIntegrationEmail = async (evt: CalendarEvent, type: "video" | "calendar") => {
  await new Promise((resolve, reject) => {
    try {
      const brokenIntegrationEmail = new BrokenIntegrationEmail(evt, type);
      resolve(brokenIntegrationEmail.sendEmail());
    } catch (e) {
      reject(console.error("FeedbackEmail.sendEmail failed", e));
    }
  });
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
  await new Promise((resolve, reject) => {
    try {
      const disabledPaymentEmail = new DisabledAppEmail(email, appName, appType, t, title, eventTypeId);
      resolve(disabledPaymentEmail.sendEmail());
    } catch (e) {
      reject(console.error("DisabledPaymentEmail.sendEmail failed", e));
    }
  });
};
