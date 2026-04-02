import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TGetListSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetListSchema;
};

export const listHandler = async ({ ctx, input }: ListOptions) => {
  const teamRepo = new TeamRepository(prisma);
  return teamRepo.findTeamsByUserId({
    userId: ctx.user.id,
    includeOrgs: input?.includeOrgs,
  });
};

export default listHandler;
