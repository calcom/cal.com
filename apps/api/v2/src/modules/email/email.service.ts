import { getTranslation } from "@calcom/platform-libraries";
import { sendSignupToOrganizationEmail } from "@calcom/platform-libraries/emails";
import { Injectable } from "@nestjs/common";

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
}
