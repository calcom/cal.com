import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { generateSecret } from "@calcom/features/oauth/utils/generateSecret";
import type { PrismaClient } from "@calcom/prisma";
import type { TCreateClientInputSchema } from "./createClient.schema";

type AddClientOptions = {
  ctx: {
    prisma: PrismaClient;
  };
  input: TCreateClientInputSchema;
};

export const createClientHandler = async ({ ctx, input }: AddClientOptions) => {
  const { name, purpose, redirectUri, logo, websiteUrl, enablePkce } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  let plainSecret: string | undefined;
  let hashedSecret: string | undefined;
  if (!enablePkce) {
    const [hashed, plain] = generateSecret();
    hashedSecret = hashed;
    plainSecret = plain;
  }

  const client = await oAuthClientRepository.create({
    name,
    purpose,
    redirectUri,
    clientSecret: hashedSecret,
    logo,
    websiteUrl,
    enablePkce,
    status: "APPROVED",
  });

  return {
    clientId: client.clientId,
    name: client.name,
    purpose: client.purpose,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    clientSecret: plainSecret,
    isPkceEnabled: enablePkce,
    status: client.status,
  };
};
