import { getOAuthService } from "@calcom/features/oauth/di/OAuthService.container";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getHttpStatusCode } from "@calcom/lib/server/getServerErrorFromUnknown";
import type { AccessScope } from "@calcom/prisma/enums";
import { httpStatusToTrpcCode } from "@calcom/trpc/server/lib/toTRPCError";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

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

  try {
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
  } catch (err) {
    if (err instanceof ErrorWithCode) {
      throw new TRPCError({
        code: httpStatusToTrpcCode(getHttpStatusCode(err)),
        message: err.message,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "server_error",
    });
  }
};
