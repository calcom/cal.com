import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import {
  findUsersWithInviteStatus,
  getOrgState,
  getTeamOrThrow,
  getUniqueInvitationsOrThrowIfEmpty,
  handleExistingUsersInvites,
  handleNewUsersInvites,
  INVITE_STATUS,
  type Invitation,
} from "@calcom/features/ee/teams/lib/inviteMemberUtils";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { MembershipRole } from "@calcom/prisma/enums";
import type { CreationSource } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["features/membership/services/MembershipService"] });

export type MembershipCheckResult = {
  isMember: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  role?: MembershipRole;
};

type TargetTeam =
  | {
    teamId: number;
  }
  | {
    team: Awaited<ReturnType<typeof getTeamOrThrow>>;
  };

export class MembershipService {
  constructor(private readonly membershipRepository: MembershipRepository = new MembershipRepository()) { }

  /**
   * Checks the membership status of a user within a specific team.
   */
  async checkMembership(teamId: number, userId: number): Promise<MembershipCheckResult> {
    const membership = await this.membershipRepository.findUniqueByUserIdAndTeamId({ teamId, userId });

    if (!membership || !membership.accepted) {
      return {
        isMember: false,
        isAdmin: false,
        isOwner: false,
        role: undefined,
      };
    }

    const { role } = membership;
    const isOwner = role === MembershipRole.OWNER;
    const isAdmin = isOwner || role === MembershipRole.ADMIN;

    return {
      isMember: true,
      isAdmin,
      isOwner,
      role,
    };
  }

  async inviteMembers(
    data: {
      language: string;
      inviterName: string | null;
      orgSlug: string | null;
      invitations: Invitation[];
      creationSource: CreationSource;
      isDirectUserAction?: boolean;
    } & TargetTeam
  ) {
    const { inviterName, orgSlug, invitations, language, creationSource, isDirectUserAction = true } = data;
    const myLog = log.getSubLogger({ prefix: ["inviteMembers"] });
    const translation = await getTranslation(language ?? "en", "common");
    const team = "team" in data ? data.team : await getTeamOrThrow(data.teamId);
    const isTeamAnOrg = team.isOrganization;

    const uniqueInvitations = await getUniqueInvitationsOrThrowIfEmpty(invitations);
    const beSilentAboutErrors = this.shouldBeSilentAboutErrors(uniqueInvitations) || !isDirectUserAction;
    const existingUsersToBeInvited = await findUsersWithInviteStatus({
      invitations: uniqueInvitations,
      team,
    });

    if (!beSilentAboutErrors) {
      // beSilentAboutErrors is false only when there is a single user being invited, so we just check the first user status here
      this.throwIfInvalidInvitationStatus({ firstExistingUser: existingUsersToBeInvited[0], translation });
    }

    const orgState = getOrgState(isTeamAnOrg, team);

    const orgConnectInfoByUsernameOrEmail = this.getOrgConnectionInfoGroupedByUsernameOrEmail({
      uniqueInvitations,
      orgState,
      team: {
        parentId: team.parentId,
        id: team.id,
      },
      isOrg: isTeamAnOrg,
    });

    const invitationsForNewUsers = this.getInvitationsForNewUsers({
      existingUsersToBeInvited,
      uniqueInvitations,
    });

    const inviter = { name: inviterName };
    let memberships: any[] = [];

    if (invitationsForNewUsers.length) {
      const newMemberships = await handleNewUsersInvites({
        invitationsForNewUsers,
        team,
        orgConnectInfoByUsernameOrEmail,
        teamId: team.id,
        language,
        isOrg: isTeamAnOrg,
        inviter,
        autoAcceptEmailDomain: orgState.autoAcceptEmailDomain,
        creationSource,
      });
      memberships = memberships.concat(newMemberships);
    }

    // Existing users have a criteria to be invited
    const invitableExistingUsers = existingUsersToBeInvited.filter(
      (invitee) => invitee.canBeInvited === INVITE_STATUS.CAN_BE_INVITED
    );

    myLog.debug(
      "Notable variables:",
      safeStringify({
        uniqueInvitations,
        orgConnectInfoByUsernameOrEmail,
        invitableExistingUsers,
        existingUsersToBeInvited,
        invitationsForNewUsers,
      })
    );

    if (invitableExistingUsers.length) {
      const existingMemberships = await handleExistingUsersInvites({
        invitableExistingUsers,
        team,
        orgConnectInfoByUsernameOrEmail,
        teamId: team.id,
        language,
        isOrg: isTeamAnOrg,
        inviter,
        orgSlug,
      });
      memberships = memberships.concat(existingMemberships);
    }

    const teamBillingServiceFactory = getTeamBillingServiceFactory();
    const teamBillingService = teamBillingServiceFactory.init(team);
    await teamBillingService.updateQuantity("addition");

    return {
      memberships,
      usernameOrEmail:
        invitations.length == 1
          ? invitations[0].usernameOrEmail
          : invitations.map((invitation) => invitation.usernameOrEmail),
      numUsersInvited: invitableExistingUsers.length + invitationsForNewUsers.length,
    };
  }

  private shouldBeSilentAboutErrors(invitations: Invitation[]) {
    const isBulkInvite = invitations.length > 1;
    return isBulkInvite;
  }

  private throwIfInvalidInvitationStatus({
    firstExistingUser,
    translation,
  }: {
    firstExistingUser: Awaited<ReturnType<typeof findUsersWithInviteStatus>>[number] | undefined;
    translation: any;
  }) {
    if (firstExistingUser && firstExistingUser.canBeInvited !== INVITE_STATUS.CAN_BE_INVITED) {
      throw new Error(translation(firstExistingUser.canBeInvited));
    }
  }

  private getOrgConnectionInfoGroupedByUsernameOrEmail({
    uniqueInvitations,
    orgState,
    team,
    isOrg,
  }: {
    uniqueInvitations: Invitation[];
    orgState: ReturnType<typeof getOrgState>;
    team: { parentId: number | null; id: number };
    isOrg: boolean;
  }) {
    return uniqueInvitations.reduce((acc, invitation) => {
      return {
        ...acc,
        [invitation.usernameOrEmail]: this.getOrgConnectionInfo({
          orgVerified: orgState.orgVerified,
          orgAutoAcceptDomain: orgState.autoAcceptEmailDomain,
          email: invitation.usernameOrEmail,
          team,
          isOrg: isOrg,
        }),
      };
    }, {} as Record<string, any>);
  }

  private getOrgConnectionInfo({
    orgAutoAcceptDomain,
    orgVerified,
    isOrg,
    email,
    team,
  }: {
    orgAutoAcceptDomain?: string | null;
    orgVerified: boolean | null;
    email: string;
    team: { parentId: number | null; id: number };
    isOrg: boolean;
  }) {
    let orgId: number | undefined;
    let autoAccept = false;

    if (team.parentId || isOrg) {
      orgId = team.parentId || team.id;
      if (email.split("@")[1] == orgAutoAcceptDomain) {
        autoAccept = !!orgVerified;
      } else {
        orgId = undefined;
        autoAccept = false;
      }
    }

    return { orgId, autoAccept };
  }

  private getInvitationsForNewUsers({
    existingUsersToBeInvited,
    uniqueInvitations,
  }: {
    existingUsersToBeInvited: Awaited<ReturnType<typeof findUsersWithInviteStatus>>;
    uniqueInvitations: Invitation[];
  }) {
    const existingUsersEmailsAndUsernames = existingUsersToBeInvited.reduce(
      (acc, user) => ({
        emails: user.email ? [...acc.emails, user.email] : acc.emails,
        usernames: user.username ? [...acc.usernames, user.username] : acc.usernames,
      }),
      { emails: [], usernames: [] } as { emails: string[]; usernames: string[] }
    );
    return uniqueInvitations.filter(
      (invitation) =>
        !existingUsersEmailsAndUsernames.emails.includes(invitation.usernameOrEmail) &&
        !existingUsersEmailsAndUsernames.usernames.includes(invitation.usernameOrEmail)
    );
  }
}
