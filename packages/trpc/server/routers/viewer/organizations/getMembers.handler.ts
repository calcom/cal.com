import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetMembersInputSchema } from "./getMembers.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetMembersInputSchema;
};

export const getMembersHandler = async ({ input, ctx }: CreateOptions) => {
  const { teamIdToExclude, accepted, distinctUser } = input;

  if (!ctx.user.organizationId) return [];

  const users = await prisma.membership.findMany({
    where: {
      user: {
        organizationId: ctx.user.organizationId,
      },
      teamId: {
        not: teamIdToExclude,
      },
      accepted,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          completedOnboarding: true,
          name: true,
        },
      },
    },
    ...(distinctUser && {
      distinct: ["userId"],
    }),
  });

  return users;
};
