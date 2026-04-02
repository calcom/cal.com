import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOwnedTeamsHandler = async ({ ctx }: ListOptions) => {
  const teamRepository = new TeamRepository(prisma);
  return await teamRepository.findOwnedTeamsByUserId({ userId: ctx.user.id });
};
