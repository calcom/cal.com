import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOtherTeamHandler = async ({ ctx: { user } }: ListOptions) => {
  if (!user?.organization?.isOrgAdmin) {
    return [];
  }
  const teamsInOrgIamNotPartOf = await prisma.team.findMany({
    where: {
      parentId: user?.organization?.id ?? null,
      members: {
        none: {
          userId: user.id,
        },
      },
    },
  });

  return teamsInOrgIamNotPartOf;
};

export default listOtherTeamHandler;
