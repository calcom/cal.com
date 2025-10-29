import { Injectable } from "@nestjs/common";

import { getTranslation } from "@calcom/platform-libraries";
import { sendSignupToOrganizationEmail, sendTeamInviteEmail } from "@calcom/platform-libraries/emails";

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

  public async sendTeamInviteEmail({
    to,
    teamName,
    from,
    joinLink,
    isCalcomMember,
    isAutoJoin,
    isOrg,
    parentTeamName,
    locale,
  }: {
    to: string;
    teamName: string;
    from: string;
    joinLink: string;
    isCalcomMember: boolean;
    isAutoJoin: boolean;
    isOrg: boolean;
    parentTeamName?: string;
    locale: string | null;
  }) {
    const translation = await getTranslation(locale || "en", "common");

    await sendTeamInviteEmail({
      language: translation,
      to,
      teamName,
      from,
      joinLink,
      isCalcomMember,
      isAutoJoin,
      isOrg,
      parentTeamName,
      isExistingUserMovedToOrg: false,
      prevLink: null,
      newLink: null,
    });
  }
}
