import type { z } from "zod";

import type { OAuth2UniversalSchema } from "../../_auth/universalSchema";
import { refreshOAuthTokens } from "./refreshOAuthTokens";

export const authInterface = ({
  resourceOwner,
  appSlug: slug,
  currentTokenResponse,
  doesResponseInvalidatesToken,
  isTokenResponseValid,
  onNewTokenResponse,
  tokenRefresh,
}: {
  resourceOwner:
    | {
        id: number | null;
        type: "team";
      }
    | {
        id: number | null;
        type: "user";
      };
  currentTokenResponse: z.infer<typeof OAuth2UniversalSchema>;
  /**
   * The unique identifier of the app that the token is for. It is required to do credential syncing in self-hosting
   */
  appSlug: string;
  tokenRefresh: (refreshToken: string) => Promise<Response>;
  doesResponseInvalidatesToken: (response: Response) => Promise<boolean>;
  isTokenResponseValid: (token: z.infer<typeof OAuth2UniversalSchema> | null) => boolean;
  onNewTokenResponse: (token: z.infer<typeof OAuth2UniversalSchema> | null) => Promise<void>;
}) => {
  if (resourceOwner.type === "team") {
    throw new Error("Teams are not supported");
  } else {
    if (!resourceOwner.id) {
      throw new Error("resourceOwner should have id set");
    }
  }
  const refreshAccessToken = async (refreshToken: string) => {
    const token = await refreshOAuthTokens({
      refresh: async () => {
        return tokenRefresh(refreshToken);
      },
      appSlug: slug,
      userId: resourceOwner.id,
      doesResponseInvalidatesToken,
    });

    return token;
  };

  const getAccessTokenAndRefreshIfNeeded = async () => {
    if (isTokenResponseValid(currentTokenResponse)) {
      return Promise.resolve(currentTokenResponse.access_token);
    } else if (currentTokenResponse.refresh_token) {
      const token = await refreshAccessToken(currentTokenResponse.refresh_token);
      await onNewTokenResponse(token);
      return token?.access_token ?? null;
    }
    return null;
  };

  return {
    getAccessTokenAndRefreshIfNeeded,
    getToken: getAccessTokenAndRefreshIfNeeded,
  };
};
