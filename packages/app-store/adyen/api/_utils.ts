import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { getAdyenKeys } from "../lib/getAdyenKeys";
import type { AdyenCredentialKeys } from "../lib/types";
import { adyenCredentialKeysSchema } from "../lib/types";
import { ADYEN_OAUTH_API_BASE_URL } from "./_adyenUrls";

const log = logger.getSubLogger({ prefix: [`[adyen/api/utils]`] });

async function refreshAdyenToken(key: AdyenCredentialKeys, clientId: string, clientSecret: string) {
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
  };
  const tokenReqBody = new URLSearchParams();
  tokenReqBody.append("grant_type", "refresh_token");
  tokenReqBody.append("refresh_token", key.refresh_token);

  let attempt = 0;
  const maxAttempts = 3;
  const retryDelay = (attempt: number) => Math.pow(2, attempt) * 1000; // Exponential backoff (e.g., 1s, 2s, 4s)

  while (attempt < maxAttempts) {
    try {
      const tokenResponse = await fetch(`${ADYEN_OAUTH_API_BASE_URL}/token`, {
        method: "POST",
        headers,
        body: tokenReqBody,
      });

      const result = await tokenResponse.json();

      if (tokenResponse.ok) {
        return result; // Token refresh was successful
      } else {
        const message = `New access_token request failed with status ${
          tokenResponse.statusText
        }: ${JSON.stringify(result)}.`;
        log.error(message);
        throw new Error(message);
      }
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        log.error(`Token refresh failed after ${maxAttempts} attempts. Error: ${error}`);
        throw new Error(`Token refresh failed after ${maxAttempts} attempts.`);
      }
      log.warn(`Attempt ${attempt} failed. Retrying in ${retryDelay(attempt)} ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt))); // Delay before retrying
    }
  }
}

export const getAdyenValidCredentialKeys = async (userId: number) => {
  const credential = await prisma.credential.findFirst({
    where: {
      type: "adyen_payment",
      userId,
      invalid: false,
    },
    select: {
      key: true,
      id: true,
    },
  });

  if (!credential) {
    const message = `Adyen Credential not found for userId:${userId}`;
    log.error(message);
    throw new Error(message);
  }

  const key = adyenCredentialKeysSchema.parse(credential?.key);
  if (Math.floor(Date.now() / 1000) < Number(key.expires_at) - 5 * 60) {
    return key;
  }

  // Get new access_token due to expiry
  const { client_id: clientId, client_secret: clientSecret } = await getAdyenKeys();

  try {
    const tokenData = await refreshAdyenToken(key, clientId, clientSecret);

    const { access_token, expires_in, refresh_token } = tokenData;
    const expires_at = Math.floor(Date.now() / 1000) + Number(expires_in);

    const updatedCredential = await prisma.credential.update({
      where: {
        id: credential.id,
      },
      data: {
        key: {
          ...key,
          access_token,
          expires_at,
          refresh_token,
        } as Prisma.InputJsonValue,
      },
    });

    if (!!updatedCredential) {
      return adyenCredentialKeysSchema.parse(updatedCredential.key);
    } else {
      const message = `Error while updating adyen credential with new access_token for userId:${userId}`;
      log.error(message);
      throw new Error(message);
    }
  } catch (error) {
    const message = `New access_token request failed after retries: ${
      error instanceof Error ? error.message : ""
    }. Please try after organizer reconnects Adyen App.`;
    log.error(message);
    throw new Error(message);
  }
};
