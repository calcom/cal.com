import getUserAdminTeams from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TAppCredentialsByIdInputSchema } from "./appCredentialsById.schema";

type AppCredentialsByIdOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAppCredentialsByIdInputSchema;
};

export const appCredentialByIdHandler = async ({ ctx, input }: AppCredentialsByIdOptions) => {
  const { user } = ctx;
  const userAdminTeams = await getUserAdminTeams({ userId: ctx.user.id, getUserInfo: true });

  const teamIds = userAdminTeams.reduce((teamIds, team) => {
    if (!team.isUser) teamIds.push(team.id);
    return teamIds;
  }, [] as number[]);

  const credential = await prisma.credential.findUnique({
    where: {
      OR: [
        { userId: user.id },
        {
          teamId: {
            in: teamIds,
          },
        },
      ],
      id: input.id,
    },
  });

  return {
    credential,
  };
};
