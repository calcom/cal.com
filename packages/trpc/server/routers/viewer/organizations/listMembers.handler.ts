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

  // I couldnt get this query to work direct on membership table
  const teamMembers = await prisma?.team.findFirst({
    where: {
      id: organizationId,
    },
    select: {
      members: {
        take: limit,
        skip: (page - 1) * limit,
        select: {
          role: true,
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
      },
    },
  });

  const members = teamMembers?.members?.map((member) => {
    return {
      id: member.user.id,
      username: member.user.username,
      email: member.user.email,
      timeZone: member.user.timeZone,
      role: member.role,
      teams: member.user.teams.map((team) => {
        return {
          id: team.team.id,
          name: team.team.name,
          slug: team.team.slug,
        };
      }),
    };
  });

  return members ?? [];
};
