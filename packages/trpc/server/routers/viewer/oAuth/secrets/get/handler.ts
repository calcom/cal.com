import { TRPCError } from "@trpc/server";

import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@calcom/prisma";

import type { TGetClientSecretsInputSchema } from "./schema";

type GetClientSecretsOptions = {
  ctx: {
    user: {
      id: number;
    };
    prisma: PrismaClient;
  };
  input: TGetClientSecretsInputSchema;
};

export const getClientSecretsHandler = async ({ ctx, input }: GetClientSecretsOptions) => {
  const { clientId } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  const client = await oAuthClientRepository.findByClientId(clientId);
  if (!client) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth Client not found" });
  }

  if (client.userId == null || client.userId !== ctx.user.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth Client not found" });
  }

  const secrets = await oAuthClientRepository.getClientSecrets(clientId);

  return secrets;
};
