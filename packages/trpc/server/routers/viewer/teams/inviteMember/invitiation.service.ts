import { randomBytes } from "crypto";
import type { TFunction } from "i18next";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { sendTeamInviteEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { createAProfileForAnExistingUser } from "@calcom/lib/createAProfileForAnExistingUser";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries/teams";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { getParsedTeam } from "@calcom/lib/server/repository/teamUtils";
import { VerificationTokenRepository } from "@calcom/lib/server/repository/verificationToken";
import type { MembershipRole } from "@calcom/prisma/enums";
import type { CreationSource } from "@calcom/prisma/enums";

import type { TeamWithParent } from "./types";

const log = logger.getSubLogger({ prefix: ["InvitationService"] });

type InvitableUser = {
  id: number;
  email: string;
  username: string | null;
  completedOnboarding: boolean;
  identityProvider: string;
  password: { hash: string } | null;
  profile: { username: string } | null;
  newRole: MembershipRole;
  needToCreateProfile: boolean | null;
  needToCreateOrgMembership: boolean | null;
};

type Invitation = {
  usernameOrEmail: string;
  role: MembershipRole;
};

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
    existingUsersWithMemberships: InvitableUser[];
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

  static async handleExistingUsersInvites({
    invitableUsers,
    team,
    orgConnectInfoByUsernameOrEmail,
    teamId,
    language,
    inviter,
    orgSlug,
    isOrg,
  }: {
    invitableUsers: InvitableUser[];
    team: TeamWithParent;
    orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
    teamId: number;
    language: TFunction;
    inviter: {
      name: string | null;
    };
    isOrg: boolean;
    orgSlug: string | null;
  }) {
    if (!team.isOrganization) {
      const [autoJoinUsers, regularUsers] = this.groupUsersByJoinability({
        existingUsersWithMemberships: invitableUsers,
        orgConnectInfoByUsernameOrEmail,
      });

      log.debug(
        "Inviting existing users to a team",
        safeStringify({
          autoJoinUsers,
          regularUsers,
        })
      );

      await MembershipRepository.createBulkMembershipsForTeam({
        teamId,
        autoJoinUsers: autoJoinUsers.map((user) => ({
          ...user,
          needToCreateProfile: user.needToCreateProfile ?? null,
          needToCreateOrgMembership: user.needToCreateOrgMembership ?? null,
        })),
        regularUsers: regularUsers.map((user) => ({
          ...user,
          needToCreateProfile: user.needToCreateProfile ?? null,
          needToCreateOrgMembership: user.needToCreateOrgMembership ?? null,
        })),
        parentId: team.parentId,
      });

      if (autoJoinUsers.length) {
        await Promise.all(
          autoJoinUsers.map(async (userToAutoJoin) => {
            await updateNewTeamMemberEventTypes(userToAutoJoin.id, team.id);
          })
        );

        await this.sendExistingUserTeamInviteEmails({
          currentUserName: inviter.name,
          currentUserTeamName: team?.name,
          existingUsersWithMemberships: autoJoinUsers,
          language,
          isOrg: isOrg,
          teamId: team.id,
          isAutoJoin: true,
          currentUserParentTeamName: team?.parent?.name,
          orgSlug,
        });
      }

      if (regularUsers.length) {
        await this.sendExistingUserTeamInviteEmails({
          currentUserName: inviter.name,
          currentUserTeamName: team?.name,
          existingUsersWithMemberships: regularUsers,
          language,
          isOrg: isOrg,
          teamId: team.id,
          isAutoJoin: false,
          currentUserParentTeamName: team?.parent?.name,
          orgSlug,
        });
      }

      const parentOrganization = team.parent;
      if (parentOrganization) {
        const parsedOrg = getParsedTeam(parentOrganization);
        // Create profiles if needed
        await Promise.all([
          autoJoinUsers
            .concat(regularUsers)
            .filter((u) => u.needToCreateProfile)
            .map((user) =>
              createAProfileForAnExistingUser({
                user: {
                  id: user.id,
                  email: user.email,
                  currentUsername: user.username,
                },
                organizationId: parsedOrg.id,
              })
            ),
        ]);
      }
    } else {
      const organization = team;
      log.debug(
        "Inviting existing users to an organization",
        safeStringify({
          invitableUsers,
        })
      );

      const existingUsersWithMembershipsNew = await Promise.all(
        invitableUsers.map(async (user) => {
          const shouldAutoAccept = orgConnectInfoByUsernameOrEmail[user.email].autoAccept;
          let profile = null;
          if (shouldAutoAccept) {
            profile = await createAProfileForAnExistingUser({
              user: {
                id: user.id,
                email: user.email,
                currentUsername: user.username,
              },
              organizationId: organization.id,
            });
          }

          return {
            ...user,
            profile,
          };
        })
      );

      await MembershipRepository.createBulkMembershipsForOrganization({
        organizationId: team.id,
        invitableUsers: invitableUsers.map((user) => ({
          ...user,
          needToCreateProfile: user.needToCreateProfile ?? null,
          needToCreateOrgMembership: user.needToCreateOrgMembership ?? null,
        })),
        orgConnectInfoByUsernameOrEmail,
      });

      const autoJoinUsers = existingUsersWithMembershipsNew.filter(
        (user) => orgConnectInfoByUsernameOrEmail[user.email].autoAccept
      );

      const regularUsers = existingUsersWithMembershipsNew.filter(
        (user) => !orgConnectInfoByUsernameOrEmail[user.email].autoAccept
      );

      // Send emails to users who auto-joined
      await this.sendExistingUserTeamInviteEmails({
        currentUserName: inviter.name,
        currentUserTeamName: team?.name,
        existingUsersWithMemberships: autoJoinUsers,
        language,
        isOrg,
        teamId: team.id,
        isAutoJoin: true,
        currentUserParentTeamName: team?.parent?.name,
        orgSlug,
      });

      // Send emails to users who need to accept invite
      await this.sendExistingUserTeamInviteEmails({
        currentUserName: inviter.name,
        currentUserTeamName: team?.name,
        existingUsersWithMemberships: regularUsers,
        language,
        isOrg,
        teamId: team.id,
        isAutoJoin: false,
        currentUserParentTeamName: team?.parent?.name,
        orgSlug,
      });
    }
  }

  static async handleNewUsersInvites({
    invitationsForNewUsers,
    team,
    orgConnectInfoByUsernameOrEmail,
    teamId,
    language,
    isOrg,
    autoAcceptEmailDomain,
    inviter,
    creationSource,
  }: {
    invitationsForNewUsers: Invitation[];
    teamId: number;
    language: TFunction;
    orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
    autoAcceptEmailDomain: string | null;
    team: TeamWithParent;
    inviter: {
      name: string | null;
    };
    isOrg: boolean;
    creationSource: CreationSource;
  }) {
    await MembershipRepository.createNewUsersConnectToOrgIfExists({
      invitations: invitationsForNewUsers,
      isOrg,
      teamId: teamId,
      orgConnectInfoByUsernameOrEmail,
      autoAcceptEmailDomain: autoAcceptEmailDomain,
      parentId: team.parentId,
      language: language.toString(),
      creationSource,
    });

    const sendVerifyEmailsPromises = invitationsForNewUsers.map((invitation) => {
      return this.sendSignupToOrganizationEmail({
        usernameOrEmail: invitation.usernameOrEmail,
        team: {
          name: team.name,
          parent: team.parent,
        },
        translation: language,
        inviterName: inviter.name ?? "",
        teamId,
        isOrg,
      });
    });
    await this.sendEmails(sendVerifyEmailsPromises);
  }

  private static groupUsersByJoinability({
    existingUsersWithMemberships,
    orgConnectInfoByUsernameOrEmail,
  }: {
    existingUsersWithMemberships: InvitableUser[];
    orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
  }) {
    const usersToAutoJoin = [];
    const regularUsers = [];

    for (const user of existingUsersWithMemberships) {
      const shouldAutoJoin = orgConnectInfoByUsernameOrEmail[user.email].autoAccept;
      if (shouldAutoJoin) {
        usersToAutoJoin.push(user);
      } else {
        regularUsers.push(user);
      }
    }

    return [usersToAutoJoin, regularUsers] as const;
  }
}
