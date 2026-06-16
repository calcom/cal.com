import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { prisma } from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";
import { getBasecampKeys } from "./getBasecampKeys";
import type { BasecampToken } from "./types";

type BasecampRefreshTokenResponse = Pick<BasecampToken, "access_token" | "refresh_token" | "expires_in">;

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
  const tokenInfoJson = (await tokenInfo.json()) as BasecampRefreshTokenResponse;
  const refreshedToken: BasecampToken = {
    ...credentialKey,
    ...tokenInfoJson,
    expires_at: Date.now() + 1000 * 3600 * 24 * 14,
  };
  await prisma.credential.update({
    where: { id: credential.id },
    data: {
      key: refreshedToken,
    },
  });
  return refreshedToken;
};
