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
  const { teamIdToExclude } = input;

  if (!ctx.user.organizationId) return null;

  const users = await prisma.membership.findMany({
    where: {
      user: {
        organizationId: ctx.user.organizationId,
      },
      ...(teamIdToExclude && {
        teamId: {
          not: teamIdToExclude,
        },
      }),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          completedOnboarding: true,
        },
      },
    },
  });

  return users;
};
