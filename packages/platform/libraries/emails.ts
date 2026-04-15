import AttendeeAddGuestsEmail from "@calcom/emails/templates/attendee-add-guests-email";
import AttendeeCancelledEmail from "@calcom/emails/templates/attendee-cancelled-email";
import AttendeeDeclinedEmail from "@calcom/emails/templates/attendee-declined-email";
import AttendeeRequestEmail from "@calcom/emails/templates/attendee-request-email";
import AttendeeRescheduledEmail from "@calcom/emails/templates/attendee-rescheduled-email";
import AttendeeScheduledEmail from "@calcom/emails/templates/attendee-scheduled-email";
import AttendeeUpdatedEmail from "@calcom/emails/templates/attendee-updated-email";
import AttendeeVerifyEmail from "@calcom/emails/templates/attendee-verify-email";
import OrganizerAddGuestsEmail from "@calcom/emails/templates/organizer-add-guests-email";
import OrganizerCancelledEmail from "@calcom/emails/templates/organizer-cancelled-email";
import OrganizerReassignedEmail from "@calcom/emails/templates/organizer-reassigned-email";
import OrganizerRequestEmail from "@calcom/emails/templates/organizer-request-email";
import OrganizerRescheduledEmail from "@calcom/emails/templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "@calcom/emails/templates/organizer-scheduled-email";
import {
  sendChangeOfEmailVerification,
  sendEmailVerificationByCode,
} from "@calcom/features/auth/lib/verifyEmail";
// sendSignupToOrganizationEmail removed (EE/org feature)
// verifyEmailCodeHandler removed (EE/workflows feature)

export { AttendeeVerifyEmail };

export { AttendeeAddGuestsEmail };

export { OrganizerAddGuestsEmail };

export { AttendeeScheduledEmail };

export { OrganizerScheduledEmail };

export { AttendeeDeclinedEmail };

export { AttendeeCancelledEmail };

export { OrganizerCancelledEmail };

export { OrganizerReassignedEmail };

export { OrganizerRescheduledEmail };

export { AttendeeRescheduledEmail };

export { AttendeeUpdatedEmail };

export { OrganizerRequestEmail };

export { AttendeeRequestEmail };

export { sendEmailVerificationByCode };
export { sendChangeOfEmailVerification };

// sendSignupToOrganizationEmail stub — org feature removed
export async function sendSignupToOrganizationEmail(_args: {
  usernameOrEmail: string;
  team: { name: string; slug?: string | null; id?: number; parent?: unknown | null };
  inviterName: string;
  teamId: number;
  isOrg: boolean;
  translation?: unknown;
}): Promise<void> {
  // No-op: organization signup emails are not available in community edition
}

// verifyEmailCodeHandler stub — used by verified-resources service
export async function verifyEmailCodeHandler(_opts: {
  input: { code: string; email: string; teamId?: number };
  ctx?: { user?: { id: number } };
}): Promise<boolean> {
  return false;
}
