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
  const { status } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  if (status) {
    return oAuthClientRepository.findByStatus(status);
  }

  return oAuthClientRepository.findAll();
};
