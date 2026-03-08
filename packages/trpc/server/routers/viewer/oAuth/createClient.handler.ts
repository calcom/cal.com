import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@calcom/prisma";
import type { TCreateClientInputSchema } from "./createClient.schema";

type AddClientOptions = {
  ctx: {
    prisma: PrismaClient;
  };
  input: TCreateClientInputSchema;
};

export const createClientHandler = async ({ ctx, input }: AddClientOptions) => {
  const { name, purpose, redirectUri, logo, websiteUrl } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  const client = await oAuthClientRepository.create({
    name,
    purpose,
    redirectUri,
    logo,
    websiteUrl,
    enablePkce: true, // Force PKCE for all new clients
    status: "APPROVED",
  });

  return {
    clientId: client.clientId,
    name: client.name,
    purpose: client.purpose,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    isPkceEnabled: true, // we force enablePkce to true on creation
    status: client.status,
  };
};
