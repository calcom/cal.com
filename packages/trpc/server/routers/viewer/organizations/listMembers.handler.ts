import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TListMembersSchema } from "./listMembers.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersSchema;
};

export const listMembersHandler = async ({ ctx, input }: GetOptions) => {
  const organizationId = ctx.user.organizationId;

  if (!organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User is not part of any organization." });
  }

  const { page, limit } = input;

  const getTotalMembers = await prisma?.membership.count({
    where: {
      teamId: organizationId,
    },
  });

  // I couldnt get this query to work direct on membership table
  const teamMembers = await prisma?.membership.findMany({
    where: {
      teamId: organizationId,
    },
    take: limit,
    skip: (page - 1) * limit,
    select: {
      role: true,
      accepted: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          timeZone: true,
          teams: {
            select: {
              team: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const members = teamMembers?.map((member) => {
    return {
      id: member.user.id,
      username: member.user.username,
      email: member.user.email,
      timeZone: member.user.timeZone,
      role: member.role,
      accepted: member.accepted,
      teams: member.user.teams.map((team) => {
        return {
          id: team.team.id,
          name: team.team.name,
          slug: team.team.slug,
        };
      }),
    };
  });

  return {
    rows: members || [],
    pageCount: Math.ceil((getTotalMembers || 0) / limit),
    totalCount: getTotalMembers || 0,
  };
};
