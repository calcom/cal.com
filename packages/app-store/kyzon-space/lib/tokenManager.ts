import prisma from "@calcom/prisma";

import {
  getKyzonCredentialKey,
  kyzonCredentialKeySchema,
  type KyzonCredentialKey,
} from "./KyzonCredentialKey";
import { kyzonAxiosInstance } from "./axios";
import { getKyzonAppKeys } from "./getKyzonAppKeys";

export async function refreshKyzonToken(credentialId: number): Promise<KyzonCredentialKey | null> {
  try {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      select: {
        key: true,
      },
    });

    if (!credential?.key) {
      return null;
    }

    const currentKey = kyzonCredentialKeySchema.parse(credential.key);

    if (!currentKey.refresh_token) {
      console.warn(`KYZON refresh skipped: credential ${credentialId} has no refresh_token`);
      return null;
    }

    const { client_id, client_secret, api_key } = await getKyzonAppKeys();

    const { data: newTokens } = await kyzonAxiosInstance.post<{
      access_token: string;
      refresh_token: string;
      token_type: "Bearer";
      expires_in: number;
      scope: string;
    }>(
      "/oauth/token",
      {
        grant_type: "refresh_token",
        refresh_token: currentKey.refresh_token,
        client_id,
        client_secret,
      },
      {
        headers: {
          "X-API-Key": api_key,
        },
      }
    );

    const newCredentialKey = getKyzonCredentialKey({ ...currentKey, ...newTokens });

    // Update the credential with new tokens
    await prisma.credential.update({
      where: { id: credentialId },
      data: {
        key: newCredentialKey,
      },
    });

    return newCredentialKey;
  } catch (error) {
    console.error("Failed to refresh KYZON token:", error);
    return null;
  }
}

// Check if token expires within next 5 minutes (buffer)
export function isTokenExpired(token: KyzonCredentialKey): boolean {
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000;

  return token.expiry_date - bufferTime <= now;
}
