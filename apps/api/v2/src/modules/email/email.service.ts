import { Injectable } from "@nestjs/common";
import { sendAppointmentConfirmationEmail } from "@calcom/emails/email-manager"; // P11ff

import { sendSignupToOrganizationEmail, getTranslation } from "@calcom/platform-libraries";

@Injectable()
export class EmailService {
  public async sendSignupToOrganizationEmail({
    usernameOrEmail,
    orgName,
    orgId,
    locale,
    inviterName,
  }: {
    usernameOrEmail: string;
    orgName: string;
    orgId: number;
    locale: string | null;
    inviterName: string;
  }) {
    const translation = await getTranslation(locale || "en", "common");

    await sendSignupToOrganizationEmail({
      usernameOrEmail,
      team: { name: orgName, parent: null },
      inviterName: inviterName,
      isOrg: true,
      teamId: orgId,
      translation,
    });
  }

  public async sendAppointmentConfirmationEmail(calEvent: any, attendee: any) { // P56a1
    await sendAppointmentConfirmationEmail(calEvent, attendee); // P56a1
  } // P56a1
}
