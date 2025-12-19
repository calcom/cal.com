import { getOAuthService } from "@calcom/features/oauth/di/OAuthService.container";
import { HttpError } from "@calcom/lib/http-error";
import { httpStatusToTrpcCode } from "@calcom/trpc/server/lib/toTRPCError";

import { TRPCError } from "@trpc/server";

import type { TGetClientInputSchema } from "./getClient.schema";

type GetClientOptions = {
  input: TGetClientInputSchema;
};

export const getClientHandler = async ({ input }: GetClientOptions) => {
  const { clientId } = input;

  const oAuthService = getOAuthService();

  try {
    const oAuthClient = await oAuthService.getClient(clientId);

    return {
      clientId: oAuthClient.clientId,
      redirectUri: oAuthClient.redirectUri,
      name: oAuthClient.name,
      logo: oAuthClient.logo,
      isTrusted: oAuthClient.isTrusted,
    };
  } catch (err) {
    if (err instanceof HttpError) {
      throw new TRPCError({ code: httpStatusToTrpcCode(err.statusCode), message: "OAuthClient not found" });
    }
  }

  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
};
