import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  const memberships = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
    },
    include: {
      team: {
        include: {
          inviteToken: true,
        },
      },
    },
    orderBy: { role: "desc" },
  });

  return memberships.map(({ team, ...membership }) => ({
    role: membership.role,
    accepted: membership.accepted,
    ...team,
  }));
};
