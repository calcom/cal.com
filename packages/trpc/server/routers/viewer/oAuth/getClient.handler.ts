import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetClientInputSchema } from "./getClient.schema";

type GetClientOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetClientInputSchema;
};

export const getClientHandler = async ({ ctx, input }: GetClientOptions) => {
  const { clientId } = input;

  const client = await prisma.oAuthClient.findFirst({
    where: {
      clientId,
    },
    select: {
      clientId: true,
      redirectUri: true,
      name: true,
    },
  });
  return client;
};
