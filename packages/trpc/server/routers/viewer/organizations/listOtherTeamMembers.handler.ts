import type { Prisma } from "@prisma/client";
import z from "zod";

import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";

export const ZListOtherTeamMembersSchema = z.object({
  teamId: z.number(),
  query: z.string().optional(),
  limit: z.number(),
  offset: z.number().optional(),
  cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
});

export type TListOtherTeamMembersSchema = z.infer<typeof ZListOtherTeamMembersSchema>;

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListOtherTeamMembersSchema;
};

export const listOtherTeamMembers = async ({ input }: ListOptions) => {
  const whereConditional: Prisma.MembershipWhereInput = {
    teamId: input.teamId,
  };
  // const { limit = 20 } = input;
  // let { offset = 0 } = input;

  const { cursor, limit } = input;

  if (input.query) {
    whereConditional.user = {
      OR: [
        {
          username: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: input.query,
            mode: "insensitive",
          },
        },
      ],
    };
  }

  const team = await prisma.team.findUnique({
    where: {
      id: input.teamId,
    },
    select: {
      parentId: true,
    },
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  const members = await prisma.membership.findMany({
    where: whereConditional,
    select: {
      id: true,
      role: true,
      accepted: true,
      disableImpersonation: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    distinct: ["userId"],
    orderBy: { role: "desc" },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
  });
  let nextCursor: typeof cursor | undefined = undefined;
  if (members && members.length > limit) {
    const nextItem = members.pop();
    nextCursor = nextItem?.id || null;
  }

  const enrichedMemberships = [];
  for (const membership of members) {
    enrichedMemberships.push({
      ...membership,
      user: await UserRepository.enrichUserWithItsProfile({
        user: membership.user,
      }),
    });
  }
  return {
    rows: enrichedMemberships.map((m) => {
      return {
        ...m,
        bookerUrl: getBookerBaseUrlSync(m.user.profile?.organization?.slug || ""),
      };
    }),
    nextCursor,
  };
};

export default listOtherTeamMembers;
