import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TTeamDeleteSchema } from "./delete.schema";

type DeleteTeamOptions = {
  ctx: {
    user: TrpcSessionUser;
    prisma: PrismaClient;
  };
  input: TTeamDeleteSchema;
};

export default async function handler({ ctx, input }: DeleteTeamOptions) {
  const { prisma } = ctx;
  const { teamId } = input;

  await prisma.team.delete({
    where: { id: teamId },
  });

  return { success: true };
}
