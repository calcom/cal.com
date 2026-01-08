import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";

import type { TAddClientInputSchema } from "./addClient.schema";

type AddClientOptions = {
  input: TAddClientInputSchema;
};

export const addClientHandler = async ({ input }: AddClientOptions) => {
  const { name, redirectUri, logo, websiteUrl, enablePkce } = input;

  const oAuthClientRepository = await OAuthClientRepository.withGlobalPrisma();

  const client = await oAuthClientRepository.create({
    name,
    redirectUri,
    logo,
    websiteUrl,
    enablePkce,
    approvalStatus: "APPROVED",
  });

  return {
    clientId: client.clientId,
    name: client.name,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    clientSecret: client.clientSecret,
    isPkceEnabled: enablePkce,
  };
};
