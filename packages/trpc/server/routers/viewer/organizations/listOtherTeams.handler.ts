import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOtherTeamHandler = async ({ ctx }: ListOptions) => {
  const teamsInOrgIamNotPartOf = await prisma.membership.findMany({
    where: {
      userId: {
        not: ctx.user.id,
      },
      team: {
        parent: {
          is: {
            id: ctx.user?.organization?.id,
          },
        },
        members: {
          none: {
            userId: ctx.user.id,
          },
        },
      },
    },
    include: {
      team: true,
    },
    orderBy: { role: "desc" },
    distinct: ["teamId"],
  });

  return teamsInOrgIamNotPartOf.map(({ team, ...membership }) => ({
    role: membership.role,
    accepted: membership.accepted,
    isOrgAdmin: true,
    ...team,
  }));
};
