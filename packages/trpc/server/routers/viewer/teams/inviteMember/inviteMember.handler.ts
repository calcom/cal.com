import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { isOrganization } from "@calcom/lib/entityPermissionUtils";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries";
import { isOrganisationOwner } from "@calcom/lib/server/queries/organisations";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { getParsedTeam } from "@calcom/lib/server/repository/teamUtils";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
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
  sendTeamInviteEmails,
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
  await checkPermissions({
    userId: ctx.user.id,
    teamId:
      ctx.user.organization.id && ctx.user.organization.isOrgAdmin ? ctx.user.organization.id : input.teamId,
    isOrg: input.isOrg,
  });

  // Only owners can award owner role in an organization.
  if (
    input.isOrg &&
    input.role === MembershipRole.OWNER &&
    !(await isOrganisationOwner(ctx.user.id, input.teamId))
  )
    throw new TRPCError({ code: "UNAUTHORIZED" });

  const team = await getTeamOrThrow(input.teamId, input.isOrg);
  const { autoAcceptEmailDomain, orgVerified } = getIsOrgVerified(input.isOrg, team);
  const usernameOrEmailsToInvite = await getUsernameOrEmailsToInvite(input.usernameOrEmail);
  const orgConnectInfoByUsernameOrEmail = usernameOrEmailsToInvite.reduce((acc, usernameOrEmail) => {
    return {
      ...acc,
      [usernameOrEmail]: getOrgConnectionInfo({
        orgVerified,
        orgAutoAcceptDomain: autoAcceptEmailDomain,
        usersEmail: usernameOrEmail,
        team,
        isOrg: input.isOrg,
      }),
    };
  }, {} as Record<string, ReturnType<typeof getOrgConnectionInfo>>);
  const existingUsersWithMembersips = await getUsersToInvite({
    usernamesOrEmails: usernameOrEmailsToInvite,
    isInvitedToOrg: input.isOrg,
    team,
  });

  const existingUsersEmailsAndUsernames = existingUsersWithMembersips.reduce(
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
      existingUsersWithMembersips,
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
        ctx,
        input,
      });
    });
    sendEmails(sendVerifEmailsPromises);
  }

  // deal with existing users invited to join the team/org
  if (existingUsersWithMembersips.length) {
    if (!isOrganization({ team })) {
      const [autoJoinUsers, regularUsers] = groupUsersByJoinability({
        existingUsersWithMembersips,
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

        await sendTeamInviteEmails({
          currentUserName: ctx?.user?.name,
          currentUserTeamName: team?.name,
          existingUsersWithMembersips: autoJoinUsers,
          language: translation,
          isOrg: input.isOrg,
          teamId: team.id,
          currentUserParentTeamName: team?.parent?.name,
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
        await sendTeamInviteEmails({
          currentUserName: ctx?.user?.name,
          currentUserTeamName: team?.name,
          existingUsersWithMembersips: regularUsers,
          language: translation,
          isOrg: input.isOrg,
          teamId: team.id,
          currentUserParentTeamName: team?.parent?.name,
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
              ProfileRepository.upsert({
                create: {
                  userId: user.id,
                  organizationId: parsedOrg.id,
                  username: getOrgUsernameFromEmail(
                    user.email,
                    parsedOrg.metadata?.orgAutoAcceptEmail || null
                  ),
                  email: user.email,
                },
                update: {
                  email: user.email,
                  username: getOrgUsernameFromEmail(
                    user.email,
                    parsedOrg.metadata?.orgAutoAcceptEmail || null
                  ),
                },
                updateWhere: {
                  userId: user.id,
                  organizationId: parsedOrg.id,
                },
              })
            ),
        ]);
      }
    } else {
      for (const user of existingUsersWithMembersips) {
        const shouldAutoAccept = orgConnectInfoByUsernameOrEmail[user.email].autoAccept;
        if (shouldAutoAccept) {
          await ProfileRepository.create({
            userId: user.id,
            organizationId: team.id,
            username: getOrgUsernameFromEmail(user.email, team.metadata?.orgAutoAcceptEmail || null),
            email: user.email,
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
      }

      await sendTeamInviteEmails({
        currentUserName: ctx?.user?.name,
        currentUserTeamName: team?.name,
        existingUsersWithMembersips,
        language: translation,
        isOrg: input.isOrg,
        teamId: team.id,
        currentUserParentTeamName: team?.parent?.name,
      });
    }
  }

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
