import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { prisma } from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";
import { getBasecampKeys } from "./getBasecampKeys";
import type { BasecampToken } from "./types";

type BasecampRefreshTokenResponse = Pick<BasecampToken, "access_token" | "refresh_token" | "expires_in">;

function isBasecampRefreshTokenResponse(value: unknown): value is BasecampRefreshTokenResponse {
  if (!value || typeof value !== "object") return false;

  const { access_token, refresh_token, expires_in } = value as Record<string, unknown>;
  return (
    typeof access_token === "string" &&
    access_token.length > 0 &&
    typeof refresh_token === "string" &&
    refresh_token.length > 0 &&
    typeof expires_in === "number" &&
    Number.isFinite(expires_in) &&
    expires_in > 0
  );
}

export const refreshAccessToken = async (credential: CredentialPayload): Promise<BasecampToken> => {
  const { client_id: clientId, client_secret: clientSecret, user_agent: userAgent } = await getBasecampKeys();
  const credentialKey = credential.key as BasecampToken;
  const params = new URLSearchParams({
    type: "refresh",
    refresh_token: credentialKey.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const tokenInfo = await fetch(`https://launchpad.37signals.com/authorization/token?${params.toString()}`, {
    method: "POST",
    headers: { "User-Agent": userAgent },
  });
  if (!tokenInfo.ok) {
    const status = [tokenInfo.status, tokenInfo.statusText].filter(Boolean).join(" ");
    let message = "Failed to refresh Basecamp token";
    if (status) {
      message = `${message}: ${status}`;
    }
    throw new ErrorWithCode(ErrorCode.InternalServerError, message, {
      status: tokenInfo.status,
      statusText: tokenInfo.statusText,
    });
  }
  const tokenInfoJson = await tokenInfo.json();
  if (!isBasecampRefreshTokenResponse(tokenInfoJson)) {
    throw new ErrorWithCode(ErrorCode.InternalServerError, "Invalid Basecamp token refresh response");
  }
  const refreshedToken: BasecampToken = {
    ...credentialKey,
    ...tokenInfoJson,
    expires_at: Date.now() + tokenInfoJson.expires_in * 1000,
  };
  await prisma.credential.update({
    where: { id: credential.id },
    data: {
      key: refreshedToken,
    },
  });
  return refreshedToken;
};
