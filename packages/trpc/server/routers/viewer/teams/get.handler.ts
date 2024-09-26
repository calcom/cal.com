import dayjs from "@calcom/dayjs";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const team = await getTeamWithMembers({
    id: input.teamId,
    currentOrg: ctx.user.profile?.organization ?? null,
    userId: ctx.user.organization?.isOrgAdmin ? undefined : ctx.user.id,
    isOrgView: input?.isOrg,
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
  }

  const membership = team?.members.find((membership) => membership.id === ctx.user.id);

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Not a member of this team." });
  }
  const { members, ...restTeam } = team;

  // Hide Members of team when 1) Org is private and logged in user is not admin or owner
  // OR
  // 2)Team is private and logged in user is not admin or owner of team or Organization's admin or owner
  function shouldHideMembers() {
    const isOrgPrivate = ctx.user.profile?.organization?.isPrivate;
    const isOrgAdminOrOwner = ctx.user.organization?.isOrgAdmin;
    const isTargetingOrg = input.teamId === ctx.user.organizationId;

    if (isTargetingOrg) {
      return isOrgPrivate && !isOrgAdminOrOwner;
    }

    const isTeamAdminOrOwner =
      membership?.role === MembershipRole.OWNER || membership?.role === MembershipRole.ADMIN;

    if (team?.isPrivate && !isTeamAdminOrOwner && !isOrgAdminOrOwner) {
      return true;
    }
    return false;
  }

  const smsCreditCount = await ctx.prisma.smsCreditCount.findFirst({
    where: {
      teamId: input.teamId,
      userId: null,
      month: dayjs().utc().startOf("month").toDate(),
    },
  });
  const membersWithUsedCredits = await Promise.all(
    members.map(async (member) => {
      const smsCreditCount = await ctx.prisma.smsCreditCount.findFirst({
        where: {
          teamId: input.teamId,
          userId: member.id,
          month: dayjs().utc().startOf("month").toDate(),
        },
      });

      return {
        ...member,
        smsCreditsUsed: smsCreditCount?.credits ?? 0,
      };
    })
  );

  return {
    ...restTeam,
    smsCreditsUsed: smsCreditCount?.credits ?? 0,
    smsLimitReached: smsCreditCount?.limitReached,
    members: shouldHideMembers() ? [] : membersWithUsedCredits,
    safeBio: markdownToSafeHTML(team.bio),
    membership: {
      role: membership.role,
      accepted: membership.accepted,
    },
  };
};

export default getHandler;
