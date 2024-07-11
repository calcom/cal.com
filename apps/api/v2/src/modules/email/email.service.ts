import { Injectable } from "@nestjs/common";

import { sendSignupToOrganizationEmail, getTranslation } from "@calcom/platform-libraries";

@Injectable()
export class EmailsService {
  async sendSignupToOrganizationEmail({ usernameOrEmail, orgName, orgId, locale }): {
    usernameOrEmail: string;
    orgName: string;
    orgId: number;
    locale?: string;
  } {
    const translation = await getTranslation(locale || "en", "common");

    await sendSignupToOrganizationEmail({
      usernameOrEmail,
      team: { name: orgName },
      isOrg: true,
      teamId: orgId,
      translation,
    });
  }
}
