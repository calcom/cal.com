import type { PrismaClient } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TSearchTeamMembersInputSchema } from "./searchTeamMembers.schema";

type SearchTeamMembersInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TSearchTeamMembersInputSchema;
};

export type TeamMemberSearchResult = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  defaultScheduleId: number | null;
};

export type SearchTeamMembersResponse = {
  members: TeamMemberSearchResult[];
  nextCursor: number | undefined;
  hasMore: boolean;
};

export const searchTeamMembersHandler = async ({
  ctx,
  input,
}: SearchTeamMembersInput): Promise<SearchTeamMembersResponse> => {
  const { teamId, cursor, limit, search } = input;

  // Verify the requesting user is a member of this team
  const callerMembership = await ctx.prisma.membership.findFirst({
    where: { teamId, userId: ctx.user.id },
    select: { id: true },
  });

  if (!callerMembership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this team" });
  }

  const where: Record<string, unknown> = {
    teamId,
    accepted: true,
  };

  const userFilter: Record<string, unknown> = {};

  if (search) {
    userFilter.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (cursor) {
    userFilter.id = { gt: cursor };
  }

  if (Object.keys(userFilter).length > 0) {
    where.user = userFilter;
  }

  const memberships = await ctx.prisma.membership.findMany({
    where,
    take: limit + 1,
    orderBy: { user: { id: "asc" } },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          username: true,
          defaultScheduleId: true,
        },
      },
      role: true,
    },
  });

  const hasMore = memberships.length > limit;
  const items = hasMore ? memberships.slice(0, limit) : memberships;
  const nextCursor = items.length > 0 ? items[items.length - 1].user.id : undefined;

  const members: TeamMemberSearchResult[] = items.map((membership) => ({
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    avatarUrl: membership.user.avatarUrl,
    username: membership.user.username,
    defaultScheduleId: membership.user.defaultScheduleId,
  }));

  return { members, nextCursor, hasMore };
};
