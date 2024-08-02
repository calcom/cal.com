import { Injectable } from "@nestjs/common";

import { sendSignupToOrganizationEmail, getTranslation } from "@calcom/platform-libraries-0.0.22";

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
