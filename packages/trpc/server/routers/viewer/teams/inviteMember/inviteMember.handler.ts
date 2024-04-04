import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { createAProfileForAnExistingUser } from "@calcom/lib/createAProfileForAnExistingUser";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries";
import { isOrganisationOwner } from "@calcom/lib/server/queries/organisations";
import { getParsedTeam } from "@calcom/lib/server/repository/teamUtils";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import type { TeamWithParent } from "./types";
import {
  checkPermissions,
  getTeamOrThrow,
  getUsernameOrEmailsToInvite,
  getOrgConnectionInfo,
  getIsOrgVerified,
  sendSignupToOrganizationEmail,
  getUsersToInvite,
  createNewUsersConnectToOrgIfExists,
  createMemberships,
  groupUsersByJoinability,
  sendExistingUserTeamInviteEmails,
  sendEmails,
} from "./utils";

const log = logger.getSubLogger({ prefix: ["inviteMember.handler"] });

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const translation = await getTranslation(input.language ?? "en", "common");
  await checkRateLimitAndThrowError({
    identifier: `invitedBy:${ctx.user.id}`,
  });
  const team = await getTeamOrThrow(input.teamId);

  const isOrg = team.isOrganization;

  // Only owners can award owner role in an organization.
  if (isOrg && input.role === MembershipRole.OWNER && !(await isOrganisationOwner(ctx.user.id, input.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  await checkPermissions({
    userId: ctx.user.id,
    teamId:
      ctx.user.organization.id && ctx.user.organization.isOrgAdmin ? ctx.user.organization.id : input.teamId,
    isOrg,
  });

  const { autoAcceptEmailDomain, orgVerified, orgConfigured, orgPublished } = getIsOrgVerified(isOrg, team);

  const usernameOrEmailsToInvite = await getUsernameOrEmailsToInvite(input.usernameOrEmail);
  const orgConnectInfoByUsernameOrEmail = usernameOrEmailsToInvite.reduce((acc, usernameOrEmail) => {
    return {
      ...acc,
      [usernameOrEmail]: getOrgConnectionInfo({
        orgConfigured,
        orgVerified,
        orgPublished,
        orgAutoAcceptDomain: autoAcceptEmailDomain,
        usersEmail: usernameOrEmail,
        team,
        isOrg: isOrg,
      }),
    };
  }, {} as Record<string, ReturnType<typeof getOrgConnectionInfo>>);
  const existingUsersWithMemberships = await getUsersToInvite({
    usernamesOrEmails: usernameOrEmailsToInvite,
    isInvitedToOrg: isOrg,
    team,
  });

  const existingUsersWithMembershipsThatNeedToBeInvited = existingUsersWithMemberships.filter(
    (invitee) => invitee.canBeInvited
  );

  const existingUsersEmailsAndUsernames = existingUsersWithMemberships.reduce(
    (acc, user) => ({
      emails: user.email ? [...acc.emails, user.email] : acc.emails,
      usernames: user.username ? [...acc.usernames, user.username] : acc.usernames,
    }),
    { emails: [], usernames: [] } as { emails: string[]; usernames: string[] }
  );

  const newUsersEmailsOrUsernames = usernameOrEmailsToInvite.filter(
    (usernameOrEmail) =>
      !existingUsersEmailsAndUsernames.emails.includes(usernameOrEmail) &&
      !existingUsersEmailsAndUsernames.usernames.includes(usernameOrEmail)
  );

  log.debug(
    "inviteMemberHandler",
    safeStringify({
      usernameOrEmailsToInvite,
      orgConnectInfoByUsernameOrEmail,
      existingUsersWithMembershipsThatNeedToBeInvited: existingUsersWithMembershipsThatNeedToBeInvited,
      existingUsersWithMemberships,
      existingUsersEmailsAndUsernames,
      newUsersEmailsOrUsernames,
    })
  );

  // deal with users to create and invite to team/org
  if (newUsersEmailsOrUsernames.length) {
    await createNewUsersConnectToOrgIfExists({
      usernamesOrEmails: newUsersEmailsOrUsernames,
      input,
      connectionInfoMap: orgConnectInfoByUsernameOrEmail,
      autoAcceptEmailDomain,
      parentId: team.parentId,
    });
    const sendVerifEmailsPromises = newUsersEmailsOrUsernames.map((usernameOrEmail) => {
      return sendSignupToOrganizationEmail({
        usernameOrEmail,
        team,
        translation,
        inviterName: ctx.user.name ?? "",
        teamId: input.teamId,
        isOrg: input.isOrg,
      });
    });
    sendEmails(sendVerifEmailsPromises);
  }

  const organization = ctx.user.profile.organization;
  const orgSlug = organization ? organization.slug || organization.requestedSlug : null;
  // deal with existing users invited to join the team/org
  await handleExistingUsersInvites({
    existingUsersWithMembersips: existingUsersWithMembershipsThatNeedToBeInvited,
    team,
    orgConnectInfoByUsernameOrEmail,
    input,
    inviter: ctx.user,
    orgSlug,
  });

  if (IS_TEAM_BILLING_ENABLED) {
    if (team.parentId) {
      await updateQuantitySubscriptionFromStripe(team.parentId);
    } else {
      await updateQuantitySubscriptionFromStripe(input.teamId);
    }
  }
  return input;
};

export default inviteMemberHandler;

async function handleExistingUsersInvites({
  existingUsersWithMembersips,
  team,
  orgConnectInfoByUsernameOrEmail,
  input,
  inviter,
  orgSlug,
}: {
  existingUsersWithMembersips: Awaited<ReturnType<typeof getUsersToInvite>>;
  team: TeamWithParent;
  orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
  input: {
    teamId: number;
    role: "ADMIN" | "MEMBER" | "OWNER";
    isOrg: boolean;
    usernameOrEmail: (string | string[]) & (string | string[] | undefined);
    language: string;
  };
  inviter: {
    name: string | null;
  };
  orgSlug: string | null;
}) {
  if (!existingUsersWithMembersips.length) {
    return;
  }

  const translation = await getTranslation(input.language ?? "en", "common");
  if (!team.isOrganization) {
    const [autoJoinUsers, regularUsers] = groupUsersByJoinability({
      existingUsersWithMembersips: existingUsersWithMembersips.map((u) => {
        return {
          ...u,
          profile: null,
        };
      }),
      team,
      connectionInfoMap: orgConnectInfoByUsernameOrEmail,
    });

    log.debug(
      "Inviting existing users to a team",
      safeStringify({
        autoJoinUsers,
        regularUsers,
      })
    );

    // invited users can autojoin, create their memberships in org
    if (autoJoinUsers.length) {
      await createMemberships({
        input,
        invitees: autoJoinUsers,
        parentId: team.parentId,
        accepted: true,
      });

      await Promise.all(
        autoJoinUsers.map(async (userToAutoJoin) => {
          await updateNewTeamMemberEventTypes(userToAutoJoin.id, team.id);
        })
      );

      await sendExistingUserTeamInviteEmails({
        currentUserName: inviter.name,
        currentUserTeamName: team?.name,
        existingUsersWithMembersips: autoJoinUsers,
        language: translation,
        isOrg: input.isOrg,
        teamId: team.id,
        isAutoJoin: true,
        currentUserParentTeamName: team?.parent?.name,
        orgSlug,
      });
    }

    // invited users cannot autojoin, create provisional memberships and send email
    if (regularUsers.length) {
      await createMemberships({
        input,
        invitees: regularUsers,
        parentId: team.parentId,
        accepted: false,
      });
      await sendExistingUserTeamInviteEmails({
        currentUserName: inviter.name,
        currentUserTeamName: team?.name,
        existingUsersWithMembersips: regularUsers,
        language: translation,
        isOrg: input.isOrg,
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
        existingUsersWithMembersips,
      })
    );

    const existingUsersWithMembershipsNew = await Promise.all(
      existingUsersWithMembersips.map(async (user) => {
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

        await prisma.membership.create({
          data: {
            userId: user.id,
            teamId: team.id,
            accepted: shouldAutoAccept,
            role: input.role,
          },
        });
        return {
          ...user,
          profile,
        };
      })
    );

    const autoJoinUsers = existingUsersWithMembershipsNew.filter(
      (user) => orgConnectInfoByUsernameOrEmail[user.email].autoAccept
    );

    const regularUsers = existingUsersWithMembershipsNew.filter(
      (user) => !orgConnectInfoByUsernameOrEmail[user.email].autoAccept
    );

    // Send emails to user who auto-joined
    await sendExistingUserTeamInviteEmails({
      currentUserName: inviter.name,
      currentUserTeamName: team?.name,
      existingUsersWithMembersips: autoJoinUsers,
      language: translation,
      isOrg: input.isOrg,
      teamId: team.id,
      isAutoJoin: true,
      currentUserParentTeamName: team?.parent?.name,
      orgSlug,
    });

    // Send emails to user who need to accept invite
    await sendExistingUserTeamInviteEmails({
      currentUserName: inviter.name,
      currentUserTeamName: team?.name,
      existingUsersWithMembersips: regularUsers,
      language: translation,
      isOrg: input.isOrg,
      teamId: team.id,
      isAutoJoin: false,
      currentUserParentTeamName: team?.parent?.name,
      orgSlug,
    });
  }
}
