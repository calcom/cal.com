import { getAllDelegationCredentialsForUserByAppType } from "@calcom/lib/delegationCredential/server";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";

type CalIdAppCredentialsByTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdAppCredentialsByTypeInputSchema;
};

/** Used for grabbing credentials on specific app pages */
export const appCredentialsByTypeHandler = async ({ ctx, input }: CalIdAppCredentialsByTypeOptions) => {
  const { user } = ctx;
  const userCalIdAdminTeams = await new UserRepository(prisma).getUserCalIdAdminTeams({
    userId: ctx.user.id,
  });
  const { user: _, ...safeCredentialSelectWithoutUser } = safeCredentialSelect;
  const userCalIdAdminTeamsIds = userCalIdAdminTeams?.calIdTeams?.map((team) => team.calIdTeam.id) ?? [];

  const credentials = await prisma.credential.findMany({
    where: {
      OR: [
        { userId: user.id },
        {
          calIdTeamId: {
            in: userCalIdAdminTeamsIds,
          },
        },
      ],
      type: input.appType,
    },
    select: {
      ...safeCredentialSelectWithoutUser,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      calIdTeam: {
        select: {
          name: true,
        },
      },
    },
  });

  const delegationCredentials = await getAllDelegationCredentialsForUserByAppType({
    user: { id: user.id, email: user.email },
    appType: input.appType,
  });

  // For app pages need to return which teams the user can install the app on
  // return user.credentials.filter((app) => app.type == input.appType).map((credential) => credential.id);
  return {
    credentials: [...delegationCredentials, ...credentials],
    userAdminTeams: userCalIdAdminTeamsIds,
  };
};
