import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TListStandaloneSchema } from "./listStandalone.schema";

type ListStandaloneOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListStandaloneSchema;
};

export const listStandaloneHandler = async ({ ctx }: ListStandaloneOptions) => {
  const teamRepo = new TeamRepository(prisma);
  const teams = await teamRepo.findStandaloneTeamsByUserId({ userId: ctx.user.id });
  return teams;
};

export default listStandaloneHandler;
