import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TListTeamAvailaiblityScheme } from "./listTeamAvailability.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListTeamAvailaiblityScheme;
};

export const listMembersHandler = async ({ ctx, input }: GetOptions) => {
  const organizationId = ctx.user.organizationId;

  if (!organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User is not part of any organization." });
  }

  const { cursor, limit } = input;

  const getTotalMembers = await prisma.membership.count({
    where: {
      teamId: organizationId,
    },
  });

  // I couldnt get this query to work direct on membership table
  const teamMembers = await prisma.membership.findMany({
    where: {
      teamId: organizationId,
      accepted: true,
    },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          timeZone: true,
        },
      },
    },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
    orderBy: {
      id: "asc",
    },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (teamMembers && teamMembers.length > limit) {
    const nextItem = teamMembers.pop();
    nextCursor = nextItem!.id;
  }

  const members = teamMembers?.map((member) => {
    return {
      id: member.user.id,
      username: member.user.username,
      email: member.user.email,
      timeZone: member.user.timeZone,
      role: member.role,
    };
  });

  return {
    rows: members || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalMembers || 0,
    },
  };
};
