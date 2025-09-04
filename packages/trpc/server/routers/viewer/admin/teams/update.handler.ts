import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TTeamUpdateSchema } from "./update.schema";

type UpdateTeamOptions = {
  ctx: {
    user: TrpcSessionUser;
    prisma: PrismaClient;
  };
  input: TTeamUpdateSchema;
};

export default async function handler({ ctx, input }: UpdateTeamOptions) {
  const { prisma } = ctx;
  const { teamId, data } = input;

  const team = await prisma.team.update({
    where: { id: teamId },
    data,
    include: {
      organizationSettings: true,
    },
  });

  return team;
}
