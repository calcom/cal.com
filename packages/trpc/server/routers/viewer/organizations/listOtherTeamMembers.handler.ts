import type { Prisma } from "@prisma/client";
import z from "zod";

import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

export const ZListOtherTeamMembersSchema = z.object({
  teamId: z.number(),
  query: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type TListOtherTeamMembersSchema = z.infer<typeof ZListOtherTeamMembersSchema>;

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListOtherTeamMembersSchema;
};

export const listOtherTeamMembers = async ({ ctx, input }: ListOptions) => {
  const whereConditional: Prisma.MembershipWhereInput = {
    teamId: input.teamId,
  };

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
          avatar: true,
        },
      },
    },
    orderBy: { role: "desc" },
    take: input.limit || 10,
    skip: input.offset || 0,
  });

  return members;
};
