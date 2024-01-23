import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { closeComDeleteTeamMembership } from "@calcom/lib/sync/SyncServiceManager";
import type { PrismaClient } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TRemoveMemberInputSchema } from "./removeMember.schema";

const log = logger.getSubLogger({ prefix: ["viewer/teams/removeMember.handler"] });
type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
    sourceIp?: string;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `removeMember.${ctx.sourceIp}`,
  });

  const isAdmin = await isTeamAdmin(ctx.user.id, input.teamId);
  const isOrgAdmin = ctx.user.profile?.organizationId
    ? await isTeamAdmin(ctx.user.id, ctx.user.profile?.organizationId)
    : false;
  if (!(isAdmin || isOrgAdmin) && ctx.user.id !== input.memberId)
    throw new TRPCError({ code: "UNAUTHORIZED" });
  // Only a team owner can remove another team owner.
  if ((await isTeamOwner(input.memberId, input.teamId)) && !(await isTeamOwner(ctx.user.id, input.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  if (ctx.user.id === input.memberId && isAdmin && !isOrgAdmin)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not remove yourself from a team you own.",
    });

  const membership = await ctx.prisma.membership.delete({
    where: {
      userId_teamId: { userId: input.memberId, teamId: input.teamId },
    },
    include: {
      user: true,
      team: true,
    },
  });

  // const parentOrg = membership.team.parentId
  //   ? await prisma.team.findUnique({
  //       where: {
  //         id: membership.team.parentId,
  //       },
  //     })
  //   : null;

  // remove user as host from team events associated with this membership
  await ctx.prisma.host.deleteMany({
    where: {
      userId: input.memberId,
      eventType: {
        teamId: input.teamId,
      },
    },
  });

  if (input.isOrg) {
    log.debug("Removing a member from the organization");

    // Deleting membership from all child teams
    const foundUser = await ctx.prisma.user.findUnique({
      where: { id: input.memberId },
      select: {
        id: true,
        movedToProfileId: true,
        email: true,
        password: true,
        username: true,
        completedOnboarding: true,
      },
    });

    const orgInfo = await ctx.prisma.team.findUnique({
      where: { id: input.teamId },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!foundUser || !orgInfo) throw new TRPCError({ code: "NOT_FOUND" });

    const parsedMetadata = teamMetadataSchema.parse(orgInfo.metadata);

    if (
      parsedMetadata?.isOrganization &&
      parsedMetadata.isOrganizationVerified &&
      parsedMetadata.orgAutoAcceptEmail
    ) {
      if (foundUser.email.endsWith(parsedMetadata.orgAutoAcceptEmail)) {
        await ctx.prisma.user.delete({
          where: { id: input.memberId },
        });
        // This should cascade delete all memberships and hosts etc
        return;
      }
    } else if ((!foundUser.username || !foundUser.password) && !foundUser.completedOnboarding) {
      await ctx.prisma.user.delete({
        where: { id: input.memberId },
      });
      // This should cascade delete all memberships and hosts etc
      return;
    }

    await ctx.prisma.membership.deleteMany({
      where: {
        team: {
          parentId: input.teamId,
        },
        userId: membership.userId,
      },
    });

    const userToDeleteMembershipOf = foundUser;

    const profileToDelete = await ProfileRepository.findByUserIdAndOrgId({
      userId: userToDeleteMembershipOf.id,
      organizationId: orgInfo.id,
    });

    if (
      userToDeleteMembershipOf.username &&
      userToDeleteMembershipOf.movedToProfileId === profileToDelete?.id
    ) {
      log.debug("Cleaning up tempOrgRedirect for user", userToDeleteMembershipOf.username);

      await ctx.prisma.tempOrgRedirect.deleteMany({
        where: {
          from: userToDeleteMembershipOf.username,
        },
      });
    }

    await ctx.prisma.$transaction([
      ctx.prisma.user.update({
        where: { id: membership.userId },
        data: { organizationId: null },
      }),
      ProfileRepository.delete({
        userId: membership.userId,
        organizationId: orgInfo.id,
      }),
    ]);
  }

  // Deleted managed event types from this team from this member
  await ctx.prisma.eventType.deleteMany({
    where: { parent: { teamId: input.teamId }, userId: membership.userId },
  });

  // Sync Services
  closeComDeleteTeamMembership(membership.user);
  if (IS_TEAM_BILLING_ENABLED) await updateQuantitySubscriptionFromStripe(input.teamId);
};

export default removeMemberHandler;
