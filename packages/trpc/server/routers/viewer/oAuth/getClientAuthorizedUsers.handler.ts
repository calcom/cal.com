import type { TRPCContext } from "@calcom/trpc/server/types";
import type { TGetClientAuthorizedUsersInputSchema } from "./getClientAuthorizedUsers.schema";

type GetClientAuthorizedUsersOptions = {
  ctx: TRPCContext;
  input: TGetClientAuthorizedUsersInputSchema;
};

export const getClientAuthorizedUsersHandler = async ({
  ctx,
  input,
}: GetClientAuthorizedUsersOptions) => {
  const { prisma } = ctx;
  const { clientId } = input;

  const authorizations = await prisma.oAuthAuthorization.findMany({
    where: { oAuthClientId: clientId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    total: authorizations.length,
    users: authorizations.map((a) => ({
      name: a.user.name,
      email: a.user.email,
      authorizedAt: a.createdAt,
      lastRefreshedAt: a.lastRefreshedAt,
    })),
  };
};