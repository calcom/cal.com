import { randomBytes } from "crypto";
import type { TFunction } from "i18next";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { sendTeamInviteEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { VerificationTokenRepository } from "@calcom/lib/server/repository/verificationToken";

const log = logger.getSubLogger({ prefix: ["InvitationService"] });

export class InvitationService {
  static async sendEmails(emailPromises: Promise<void>[]) {
    const sentEmails = await Promise.allSettled(emailPromises);
    sentEmails.forEach((sentEmail) => {
      if (sentEmail.status === "rejected") {
        logger.error("Could not send email to user. Reason:", sentEmail.reason);
      }
    });
  }

  static async sendExistingUserTeamInviteEmails({
    existingUsersWithMemberships,
    language,
    currentUserTeamName,
    currentUserName,
    currentUserParentTeamName,
    isOrg,
    teamId,
    isAutoJoin,
    orgSlug,
  }: {
    language: TFunction;
    isAutoJoin: boolean;
    existingUsersWithMemberships: {
      email: string;
      username: string | null;
      completedOnboarding: boolean;
      identityProvider: string;
      password: { hash: string } | null;
      profile: { username: string } | null;
    }[];
    currentUserTeamName?: string;
    currentUserParentTeamName: string | undefined;
    currentUserName?: string | null;
    isOrg: boolean;
    teamId: number;
    orgSlug: string | null;
  }) {
    if (!currentUserTeamName) {
      throw new Error("The team doesn't have a name");
    }

    const sendEmailsPromises = existingUsersWithMemberships.map(async (user) => {
      const sendTo = user.email;

      log.debug("Sending team invite email", { user, currentUserName, currentUserTeamName });

      const inviteTeamOptions = {
        joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
        isCalcomMember: true,
      };

      if (!user.completedOnboarding && !user.password?.hash && user.identityProvider === "CAL") {
        const token = randomBytes(32).toString("hex");
        await VerificationTokenRepository.create({
          identifier: user.email,
          token,
          expires: new Date(new Date().setHours(168)), // +1 week
          teamId,
        });

        inviteTeamOptions.joinLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`;
        inviteTeamOptions.isCalcomMember = false;
      }

      return sendTeamInviteEmail({
        language,
        isAutoJoin,
        from: currentUserName ?? `${currentUserTeamName}'s admin`,
        to: sendTo,
        teamName: currentUserTeamName,
        ...inviteTeamOptions,
        isOrg: isOrg,
        parentTeamName: currentUserParentTeamName,
        isExistingUserMovedToOrg: true,
        prevLink: `${getOrgFullOrigin("")}/${user.username || ""}`,
        newLink: user.profile ? `${getOrgFullOrigin(orgSlug ?? "")}/${user.profile.username}` : null,
      });
    });

    await this.sendEmails(sendEmailsPromises);
  }

  static async sendSignupToOrganizationEmail({
    usernameOrEmail,
    team,
    translation,
    inviterName,
    teamId,
    isOrg,
  }: {
    usernameOrEmail: string;
    team: { name: string; parent: { name: string } | null };
    translation: TFunction;
    inviterName: string;
    teamId: number;
    isOrg: boolean;
  }) {
    try {
      const token = randomBytes(32).toString("hex");

      await VerificationTokenRepository.create({
        identifier: usernameOrEmail,
        token,
        expires: new Date(new Date().setHours(168)), // +1 week
        teamId,
      });

      await sendTeamInviteEmail({
        language: translation,
        from: inviterName || `${team.name}'s admin`,
        to: usernameOrEmail,
        teamName: team.name,
        joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`,
        isCalcomMember: false,
        isOrg: isOrg,
        parentTeamName: team?.parent?.name,
        isAutoJoin: false,
        isExistingUserMovedToOrg: false,
        prevLink: null,
        newLink: null,
      });
    } catch (error) {
      logger.error(
        "Failed to send signup to organization email",
        {
          usernameOrEmail,
          orgId: teamId,
        },
        error
      );
    }
  }
}
