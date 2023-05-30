import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  if (ctx.user?.organization?.id) {
    const membershipsWithoutParent = await prisma.membership.findMany({
      where: {
        userId: ctx.user.id,
        team: {
          parent: {
            is: {
              id: ctx.user?.organization?.id,
            },
          },
        },
      },
      include: {
        team: true,
      },
      orderBy: { role: "desc" },
    });

    return membershipsWithoutParent.map(({ team, ...membership }) => ({
      role: membership.role,
      accepted: membership.accepted,
      ...team,
    }));
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
    },
    include: {
      team: true,
    },
    orderBy: { role: "desc" },
  });

  return memberships.map(({ team, ...membership }) => ({
    role: membership.role,
    accepted: membership.accepted,
    ...team,
  }));
};
