import { prisma } from "@calcom/prisma";

import type { TGetClientInputSchema } from "./getClient.schema";

type GetClientOptions = {
  input: TGetClientInputSchema;
};

export const getClientHandler = async ({ input }: GetClientOptions) => {
  const { clientId } = input;

  const client = await prisma.oAuthClient.findFirst({
    where: {
      clientId,
    },
    select: {
      clientId: true,
      redirectUri: true,
      name: true,
      logo: true,
    },
  });
  return client;
};
