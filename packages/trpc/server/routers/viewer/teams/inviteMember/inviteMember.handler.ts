import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isOrganisationOwner } from "@calcom/lib/server/queries/organisations";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import {
  checkPermissions,
  getTeamOrThrow,
  getUniqueInvitationsOrThrowIfEmpty,
  getOrgConnectionInfo,
  getOrgState,
  sendSignupToOrganizationEmail,
  getExistingUsersWithInviteStatus,
  createNewUsersConnectToOrgIfExists,
  sendEmails,
  INVITE_STATUS,
  handleExistingUsersInvites,
} from "./utils";

const log = logger.getSubLogger({ prefix: ["inviteMember.handler"] });

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const myLog = log.getSubLogger({ prefix: ["inviteMemberHandler"] });
  const translation = await getTranslation(input.language ?? "en", "common");
  await checkRateLimitAndThrowError({
    identifier: `invitedBy:${ctx.user.id}`,
  });

  const usernameOrEmailList =
    typeof input.usernameOrEmail === "string" ? [input.usernameOrEmail] : input.usernameOrEmail;

  const invitations = usernameOrEmailList.map((item) => {
    if (typeof item === "string") return { usernameOrEmail: item, role: input.role ?? MembershipRole.MEMBER };
    return {
      usernameOrEmail: item.email,
      role: item.role,
    };
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

  const { autoAcceptEmailDomain, orgVerified } = getOrgState(isOrg, team);

  const uniqueInvitations = await getUniqueInvitationsOrThrowIfEmpty(invitations);

  const isBulkInvite = uniqueInvitations.length > 1;
  const beSilentAboutErrors = isBulkInvite;

  const orgConnectInfoByUsernameOrEmail = uniqueInvitations.reduce((acc, invitation) => {
    return {
      ...acc,
      [invitation.usernameOrEmail]: getOrgConnectionInfo({
        orgVerified,
        orgAutoAcceptDomain: autoAcceptEmailDomain,
        usersEmail: invitation.usernameOrEmail,
        team,
        isOrg: isOrg,
      }),
    };
  }, {} as Record<string, ReturnType<typeof getOrgConnectionInfo>>);

  const existingUsersToBeInvited = await getExistingUsersWithInviteStatus({
    invitations: uniqueInvitations,
    team,
  });

  // Existing users have a criteria to be invited
  const invitableExistingUsers = existingUsersToBeInvited.filter(
    (invitee) => invitee.canBeInvited === INVITE_STATUS.CAN_BE_INVITED
  );

  // beSilentAboutErrors is false only when there is a single user being invited, so we just check the first item status here
  // Bulk invites error are silently ignored and they should be logged differently when needed
  const firstExistingUser = existingUsersToBeInvited[0];
  if (
    !beSilentAboutErrors &&
    firstExistingUser &&
    firstExistingUser.canBeInvited !== INVITE_STATUS.CAN_BE_INVITED
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: translation(existingUsersToBeInvited[0].canBeInvited),
    });
  }

  const existingUsersEmailsAndUsernames = existingUsersToBeInvited.reduce(
    (acc, user) => ({
      emails: user.email ? [...acc.emails, user.email] : acc.emails,
      usernames: user.username ? [...acc.usernames, user.username] : acc.usernames,
    }),
    { emails: [], usernames: [] } as { emails: string[]; usernames: string[] }
  );

  const invitationsForNewUsers = uniqueInvitations.filter(
    (invitation) =>
      !existingUsersEmailsAndUsernames.emails.includes(invitation.usernameOrEmail) &&
      !existingUsersEmailsAndUsernames.usernames.includes(invitation.usernameOrEmail)
  );

  myLog.debug(
    "Notable variables:",
    safeStringify({
      uniqueInvitations,
      orgConnectInfoByUsernameOrEmail,
      invitableExistingUsers,
      existingUsersToBeInvited,
      existingUsersEmailsAndUsernames,
      invitationsForNewUsers,
    })
  );

  if (invitationsForNewUsers.length) {
    await createNewUsersConnectToOrgIfExists({
      invitations: invitationsForNewUsers,
      isOrg: input.isOrg,
      teamId: input.teamId,
      connectionInfoMap: orgConnectInfoByUsernameOrEmail,
      autoAcceptEmailDomain,
      parentId: team.parentId,
    });
    const sendVerifyEmailsPromises = invitationsForNewUsers.map((invitation) => {
      return sendSignupToOrganizationEmail({
        usernameOrEmail: invitation.usernameOrEmail,
        team: {
          name: team.name,
          parent: team.parent,
        },
        translation,
        inviterName: ctx.user.name ?? "",
        teamId: input.teamId,
        isOrg: input.isOrg,
      });
    });
    sendEmails(sendVerifyEmailsPromises);
  }

  const organization = ctx.user.profile.organization;
  const orgSlug = organization ? organization.slug || organization.requestedSlug : null;
  // deal with existing users invited to join the team/org
  await handleExistingUsersInvites({
    invitableExistingUsers,
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
  return {
    ...input,
    numUsersInvited: invitableExistingUsers.length + invitationsForNewUsers.length,
  };
};

export default inviteMemberHandler;
