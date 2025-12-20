import { getOAuthService } from "@calcom/features/oauth/di/OAuthService.container";

import type { TGetClientInputSchema } from "./getClient.schema";

type GetClientOptions = {
  input: TGetClientInputSchema;
};

export const getClientHandler = async ({ input }: GetClientOptions) => {
  const { clientId } = input;

  const oAuthService = getOAuthService();

  const oAuthClient = await oAuthService.getClient(clientId);

  return {
    clientId: oAuthClient.clientId,
    redirectUri: oAuthClient.redirectUri,
    name: oAuthClient.name,
    logo: oAuthClient.logo,
    isTrusted: oAuthClient.isTrusted,
  };
};
