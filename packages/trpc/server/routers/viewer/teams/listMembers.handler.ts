import { Prisma } from "@prisma/client";

import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TListMembersInputSchema } from "./listMembers.schema";

type ListMembersHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersInputSchema;
};

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  id: true,
  bio: true,
  disableImpersonation: true,
});

export const listMembersHandler = async ({ ctx, input }: ListMembersHandlerOptions) => {
  const { cursor, limit, teamIds, searchTerm } = input;

  const accessibleTeamIds = await getAccessibleTeamIds(ctx, teamIds);

  if (accessibleTeamIds.length === 0) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to see members of any teams",
    });
  }

  const whereCondition: Prisma.MembershipWhereInput = {
    teamId: { in: accessibleTeamIds },
  };

  if (searchTerm) {
    whereCondition.user = {
      OR: [
        { email: { contains: searchTerm, mode: "insensitive" } },
        { username: { contains: searchTerm, mode: "insensitive" } },
        { name: { contains: searchTerm, mode: "insensitive" } },
      ],
    };
  }

  const totalMembers = await prisma.membership.count({ where: whereCondition });

  const teamMembers = await prisma.membership.findMany({
    where: whereCondition,
    select: {
      id: true,
      role: true,
      accepted: true,
      teamId: true,
      user: { select: userSelect },
    },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    orderBy: { id: "asc" },
    distinct: ["userId"],
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (teamMembers.length > limit) {
    const nextItem = teamMembers.pop();
    nextCursor = nextItem?.id;
  }

  const membersWithApps = await Promise.all(
    teamMembers.map(async (member) => {
      const user = await UserRepository.enrichUserWithItsProfile({
        user: member.user,
      });
      const { profile, ...restUser } = user;
      return {
        ...restUser,
        username: profile?.username ?? restUser.username,
        role: member.role,
        profile: profile,
        organizationId: profile?.organizationId ?? null,
        organization: profile?.organization,
        accepted: member.accepted,
        disableImpersonation: user.disableImpersonation,
        bookerUrl: getBookerBaseUrlSync(profile?.organization?.slug || ""),
        teamId: member.teamId,
      };
    })
  );

  return {
    members: membersWithApps,
    nextCursor,
    meta: {
      totalRowCount: totalMembers,
    },
  };
};

async function getAccessibleTeamIds(ctx: ListMembersHandlerOptions["ctx"], teamIds?: number[]) {
  if (teamIds && teamIds.length > 0) {
    return Promise.all(
      teamIds.map(async (teamId) => ((await checkCanAccessMembers(ctx, teamId)) ? teamId : null))
    ).then((ids) => ids.filter((id): id is number => id !== null));
  } else {
    const userTeams = await prisma.membership.findMany({
      where: { userId: ctx.user.id, accepted: true },
      select: { teamId: true },
    });
    return userTeams.map((team) => team.teamId);
  }
}

const checkCanAccessMembers = async (ctx: ListMembersHandlerOptions["ctx"], teamId: number) => {
  const isOrgPrivate = ctx.user.profile?.organization?.isPrivate;
  const isOrgAdminOrOwner = ctx.user.organization?.isOrgAdmin;
  const orgId = ctx.user.organizationId;
  const isTargetingOrg = teamId === ctx.user.organizationId;

  if (isTargetingOrg) {
    return isOrgPrivate && !isOrgAdminOrOwner;
  }
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  if (isOrgAdminOrOwner && team?.parentId === orgId) {
    return true;
  }

  const membership = await prisma.membership.findFirst({
    where: {
      teamId,
      userId: ctx.user.id,
    },
  });

  const isTeamAdminOrOwner =
    membership?.role === MembershipRole.OWNER || membership?.role === MembershipRole.ADMIN;

  if (team?.isPrivate && !isTeamAdminOrOwner) {
    return false;
  }
  return true;
};

export default listMembersHandler;
