import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TTeamDeleteSchema } from "./delete.schema";

type GetTeamOptions = {
  ctx: {
    user: TrpcSessionUser;
    prisma: PrismaClient;
  };
  input: TTeamDeleteSchema;
};

export default async function handler({ ctx, input }: GetTeamOptions) {
  const { prisma } = ctx;
  const { teamId } = input;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      organizationSettings: {},
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  return team;
}
