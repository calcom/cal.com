import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@calcom/prisma";

import type { TListClientsInputSchema } from "./listClients.schema";

type ListClientsOptions = {
  ctx: {
    prisma: PrismaClient;
  };
  input: TListClientsInputSchema;
};

export const listClientsHandler = async ({ ctx, input }: ListClientsOptions) => {
  const { status, page, pageSize } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  return oAuthClientRepository.findByStatusPaginated(page, pageSize, status);
};
