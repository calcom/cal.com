import { getTeamRepository } from "@calcom/features/di/containers/TeamRepository";
import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOwnedTeamsHandler = async ({ ctx }: ListOptions) => {
  const teamRepository = getTeamRepository();
  return await teamRepository.findOwnedTeamsByUserId({ userId: ctx.user.id });
};
