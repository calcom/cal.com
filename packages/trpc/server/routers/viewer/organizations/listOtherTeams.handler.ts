import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOtherTeamHandler = async ({ ctx }: ListOptions) => {
  const teamsInOrgIamNotPartOf = await prisma.team.findMany({
    where: {
      parent: {
        id: ctx.user?.organization?.id,
      },
      members: {
        none: {
          userId: ctx.user.id,
        },
      },
    },
  });

  return teamsInOrgIamNotPartOf;
};

export default listOtherTeamHandler;
