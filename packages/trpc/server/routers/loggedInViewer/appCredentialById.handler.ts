import getUserAdminTeams from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TAppCredentialByIdInputSchema } from "./appCredentialById.schema";
import { handleCredentialParsing } from "./appCredentialById.validator";

export type AppCredentialsByIdOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAppCredentialByIdInputSchema;
};

export const appCredentialByIdHandler = async ({ ctx, input }: AppCredentialsByIdOptions) => {
  const { user } = ctx;
  const userAdminTeams = await getUserAdminTeams({ userId: ctx.user.id, getUserInfo: true });

  const teamIds = userAdminTeams.reduce((teamIds, team) => {
    if (!team.isUser) teamIds.push(team.id);
    return teamIds;
  }, [] as number[]);

  const appCredential = await prisma.credential.findUnique({
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

  if (appCredential) {
    return await handleCredentialParsing(appCredential);
  } else return {};
};
