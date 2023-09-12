import getUserAdminTeams from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";

type AppCredentialsByTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAppCredentialsByTypeInputSchema;
};

/** Used for grabbing credentials on specific app pages */
export const appCredentialsByTypeHandler = async ({ ctx, input }: AppCredentialsByTypeOptions) => {
  const { user } = ctx;
  const userAdminTeams = await getUserAdminTeams({ userId: ctx.user.id, getUserInfo: true });

  const teamIds = userAdminTeams.reduce((teamIds, team) => {
    if (!team.isUser) teamIds.push(team.id);
    return teamIds;
  }, [] as number[]);

  const credentials = await prisma.credential.findMany({
    where: {
      OR: [
        { userId: user.id },
        {
          teamId: {
            in: teamIds,
          },
        },
      ],
      type: input.appType,
    },
  });

  // For app pages need to return which teams the user can install the app on
  // return user.credentials.filter((app) => app.type == input.appType).map((credential) => credential.id);
  return {
    credentials,
    userAdminTeams,
  };
};
