import { type TFunction } from "i18next";

import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isOrganisationOwner } from "@calcom/features/pbac/utils/isOrganisationAdmin";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { CreationSource } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import type { TeamWithParent } from "./types";
import type { Invitation } from "./utils";
import {
  ensureAtleastAdminPermissions,
  findUsersWithInviteStatus,
  getOrgConnectionInfo,
  getOrgState,
  getTeamOrThrow,
  getUniqueInvitationsOrThrowIfEmpty,
  handleExistingUsersInvites,
  handleNewUsersInvites,
  INVITE_STATUS,
} from "./utils";

const log = logger.getSubLogger({ prefix: ["inviteMember.handler"] });

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

function getOrgConnectionInfoGroupedByUsernameOrEmail({
  uniqueInvitations,
  orgState,
  team,
  isOrg,
}: {
  uniqueInvitations: { usernameOrEmail: string; role: MembershipRole }[];
  orgState: ReturnType<typeof getOrgState>;
  team: Pick<TeamWithParent, "parentId" | "id">;
  isOrg: boolean;
}) {
  return uniqueInvitations.reduce((acc, invitation) => {
    return {
      ...acc,
      [invitation.usernameOrEmail]: getOrgConnectionInfo({
        orgVerified: orgState.orgVerified,
        orgAutoAcceptDomain: orgState.autoAcceptEmailDomain,
        email: invitation.usernameOrEmail,
        team,
        isOrg: isOrg,
      }),
    };
  }, {} as Record<string, ReturnType<typeof getOrgConnectionInfo>>);
}

function getInvitationsForNewUsers({
  existingUsersToBeInvited,
  uniqueInvitations,
}: {
  existingUsersToBeInvited: Awaited<ReturnType<typeof findUsersWithInviteStatus>>;
  uniqueInvitations: { usernameOrEmail: string; role: MembershipRole }[];
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

function throwIfInvalidInvitationStatus({
  firstExistingUser,
  translation,
}: {
  firstExistingUser: Awaited<ReturnType<typeof findUsersWithInviteStatus>>[number] | undefined;
  translation: TFunction;
}) {
  if (firstExistingUser && firstExistingUser.canBeInvited !== INVITE_STATUS.CAN_BE_INVITED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: translation(firstExistingUser.canBeInvited),
    });
  }
}

function shouldBeSilentAboutErrors(invitations: Invitation[]) {
  const isBulkInvite = invitations.length > 1;
  return isBulkInvite;
}

function buildInvitationsFromInput({
  usernameOrEmail,
  roleForAllInvitees,
}: {
  usernameOrEmail: TInviteMemberInputSchema["usernameOrEmail"];
  roleForAllInvitees: MembershipRole | undefined;
}) {
  const usernameOrEmailList = typeof usernameOrEmail === "string" ? [usernameOrEmail] : usernameOrEmail;

  return usernameOrEmailList.map((usernameOrEmail) => {
    if (typeof usernameOrEmail === "string")
      return { usernameOrEmail: usernameOrEmail, role: roleForAllInvitees ?? MembershipRole.MEMBER };
    return {
      usernameOrEmail: usernameOrEmail.email,
      role: usernameOrEmail.role,
    };
  });
}

type TargetTeam =
  | {
      teamId: number;
    }
  | {
      team: TeamWithParent;
    };

export const inviteMembersWithNoInviterPermissionCheck = async (
  data: {
    // TODO: Remove `input` and instead pass the required fields directly
    language: string;
    inviterName: string | null;
    orgSlug: string | null;
    invitations: {
      usernameOrEmail: string;
      role: MembershipRole;
    }[];
    creationSource: CreationSource;
    /**
     * Whether invitation is a direct user action or not i.e. we need to show them User based errors like inviting existing users or not.
     */
    isDirectUserAction?: boolean;
  } & TargetTeam
) => {
  const { inviterName, orgSlug, invitations, language, creationSource, isDirectUserAction = true } = data;
  const myLog = log.getSubLogger({ prefix: ["inviteMembers"] });
  const translation = await getTranslation(language ?? "en", "common");
  const team = "team" in data ? data.team : await getTeamOrThrow(data.teamId);
  const isTeamAnOrg = team.isOrganization;

  const uniqueInvitations = await getUniqueInvitationsOrThrowIfEmpty(invitations);
  const beSilentAboutErrors = shouldBeSilentAboutErrors(uniqueInvitations) || !isDirectUserAction;
  const existingUsersToBeInvited = await findUsersWithInviteStatus({
    invitations: uniqueInvitations,
    team,
  });

  if (!beSilentAboutErrors) {
    // beSilentAboutErrors is false only when there is a single user being invited, so we just check the first user status here
    throwIfInvalidInvitationStatus({ firstExistingUser: existingUsersToBeInvited[0], translation });
  }

  const orgState = getOrgState(isTeamAnOrg, team);

  const orgConnectInfoByUsernameOrEmail = getOrgConnectionInfoGroupedByUsernameOrEmail({
    uniqueInvitations,
    orgState,
    team: {
      parentId: team.parentId,
      id: team.id,
    },
    isOrg: isTeamAnOrg,
  });

  const invitationsForNewUsers = getInvitationsForNewUsers({
    existingUsersToBeInvited,
    uniqueInvitations,
  });

  const inviter = { name: inviterName };

  if (invitationsForNewUsers.length) {
    await handleNewUsersInvites({
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
    await handleExistingUsersInvites({
      invitableExistingUsers,
      team,
      orgConnectInfoByUsernameOrEmail,
      teamId: team.id,
      language,
      isOrg: isTeamAnOrg,
      inviter,
      orgSlug,
    });
  }

  const teamBillingServiceFactory = getTeamBillingServiceFactory();
  const teamBillingService = teamBillingServiceFactory.init(team);
  await teamBillingService.updateQuantity();

  return {
    // TODO: Better rename it to invitations only maybe?
    usernameOrEmail:
      invitations.length == 1
        ? invitations[0].usernameOrEmail
        : invitations.map((invitation) => invitation.usernameOrEmail),
    numUsersInvited: invitableExistingUsers.length + invitationsForNewUsers.length,
  };
};

const inviteMembers = async ({ ctx, input }: InviteMemberOptions) => {
  const { user: inviter } = ctx;
  const { usernameOrEmail, role, isPlatform, creationSource } = input;

  const team = await getTeamOrThrow(input.teamId);

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: team.id,
    permission: "team.invite",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not authorized to invite team members in this organization's team",
    });
  }

  const requestedSlugForTeam = team?.metadata?.requestedSlug ?? null;
  const isTeamAnOrg = team.isOrganization;
  const organization = inviter.profile.organization;

  let inviterOrgId = inviter.organization.id;
  let orgSlug = organization ? organization.slug || organization.requestedSlug : null;
  let isInviterOrgAdmin = inviter.organization.isOrgAdmin;

  const invitations = buildInvitationsFromInput({
    usernameOrEmail,
    roleForAllInvitees: role,
  });
  const isAddingNewOwner = !!invitations.find((invitation) => invitation.role === MembershipRole.OWNER);

  if (isTeamAnOrg) {
    await throwIfInviterCantAddOwnerToOrg();
  }

  if (isPlatform) {
    inviterOrgId = team.id;
    orgSlug = team ? team.slug || requestedSlugForTeam : null;
    isInviterOrgAdmin = await new UserRepository(prisma).isAdminOrOwnerOfTeam({
      userId: inviter.id,
      teamId: team.id,
    });
  }

  await ensureAtleastAdminPermissions({
    userId: inviter.id,
    teamId: inviterOrgId && isInviterOrgAdmin ? inviterOrgId : input.teamId,
    isOrg: isTeamAnOrg,
  });
  const result = await inviteMembersWithNoInviterPermissionCheck({
    inviterName: inviter.name,
    team,
    language: input.language,
    creationSource,
    orgSlug,
    invitations,
  });
  return result;

  async function throwIfInviterCantAddOwnerToOrg() {
    const isInviterOrgOwner = await isOrganisationOwner(inviter.id, input.teamId);
    if (isAddingNewOwner && !isInviterOrgOwner) throw new TRPCError({ code: "UNAUTHORIZED" });
  }
};

export default async function inviteMemberHandler({ ctx, input }: InviteMemberOptions) {
  const { user: inviter } = ctx;
  await checkRateLimitAndThrowError({
    identifier: `invitedBy:${inviter.id}`,
  });
  return await inviteMembers({ ctx, input });
}
