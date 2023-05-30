import getUserAdminTeams from "@calcom/features/ee/teams/lib/getUserAdminTeams";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getUserAdminTeamsHandler = async ({ ctx }: ListOptions) => {
  const teams = await getUserAdminTeams(ctx.user.id);

  return teams;
};
