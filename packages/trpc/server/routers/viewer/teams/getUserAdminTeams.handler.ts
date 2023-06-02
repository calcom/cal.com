import getUserAdminTeams from "@calcom/features/ee/teams/lib/getUserAdminTeams";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetUserAdminTeamsInputSchema } from "./getUserAdminTeams.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetUserAdminTeamsInputSchema;
};

export const getUserAdminTeamsHandler = async ({ ctx, input }: ListOptions) => {
  const teams = await getUserAdminTeams({ userId: ctx.user.id, getUserInfo: input.getUserInfo });
  // TODO display install options for app pages and disable if already installed
  return teams;
};
