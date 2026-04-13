import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@calcom/prisma";

import type { TCountClientsInputSchema } from "./count-clients.schema";

type CountClientsOptions = {
  ctx: {
    prisma: PrismaClient;
  };
  input: TCountClientsInputSchema;
};

export const countClientsHandler = async ({ ctx, input }: CountClientsOptions) => {
  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);
  return oAuthClientRepository.countByStatus(input.status);
};
