import { getAllDelegationCredentialsForUserByAppType } from "@calcom/app-store/delegationCredential";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

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
  const userAdminTeams = await new UserRepository(prisma).getUserAdminTeams({ userId: ctx.user.id });
  const { user: _, ...safeCredentialSelectWithoutUser } = safeCredentialSelect;
  const userAdminTeamsIds = userAdminTeams?.teams?.map(({ team }) => team.id) ?? [];

  const credentials = await prisma.credential.findMany({
    where: {
      OR: [
        { userId: user.id },
        {
          teamId: {
            in: userAdminTeamsIds,
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
        },
      },
      team: {
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
    userAdminTeams: userAdminTeamsIds,
  };
};
