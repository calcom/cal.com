import { getOAuthService } from "@calcom/features/oauth/di/OAuthService.container";
import { OAUTH_ERROR_REASONS, OAuthErrorReason } from "@calcom/features/oauth/services/OAuthService";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getHttpStatusCode } from "@calcom/lib/server/getServerErrorFromUnknown";
import { httpStatusToTrpcCode } from "@calcom/trpc/server/lib/toTRPCError";

import { TRPCError } from "@trpc/server";

import type { TGetClientForAuthorizationInputSchema } from "./getClientForAuthorization.schema";

type GetClientForAuthorizationOptions = {
  input: TGetClientForAuthorizationInputSchema;
};

export const getClientForAuthorizationHandler = async ({ input }: GetClientForAuthorizationOptions) => {
  try {
    const { clientId, redirectUri } = input;

    const oAuthService = getOAuthService();

    const oAuthClient = await oAuthService.getClientForAuthorization(clientId, redirectUri);

    return {
      clientId: oAuthClient.clientId,
      redirectUri: oAuthClient.redirectUri,
      name: oAuthClient.name,
      logo: oAuthClient.logo,
      isTrusted: oAuthClient.isTrusted,
    };
  } catch (error) {
    if (error instanceof ErrorWithCode) {
      throw new TRPCError({
        code: httpStatusToTrpcCode(getHttpStatusCode(error)),
        message: OAUTH_ERROR_REASONS[error?.data?.reason as OAuthErrorReason] ?? error.message,
        cause: error,
      });
    }
    throw error;
  }
};
