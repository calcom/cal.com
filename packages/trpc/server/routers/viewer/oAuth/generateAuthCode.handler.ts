import { getOAuthService } from "@calcom/features/oauth/di/OAuthService.container";
import type { AccessScope } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";

type AddClientOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGenerateAuthCodeInputSchema;
};

export const generateAuthCodeHandler = async ({ ctx, input }: AddClientOptions) => {
  const { clientId, scopes, teamSlug, codeChallenge, codeChallengeMethod, state, redirectUri } = input;
  const oAuthService = getOAuthService();

  const oAuthClientRedirectUri = redirectUri;
  const { authorizationCode, client } = await oAuthService.generateAuthorizationCode(
    clientId,
    ctx.user.id,
    oAuthClientRedirectUri,
    scopes as AccessScope[],
    state,
    teamSlug,
    codeChallenge,
    codeChallengeMethod
  );
  return { client, authorizationCode: authorizationCode };
};
