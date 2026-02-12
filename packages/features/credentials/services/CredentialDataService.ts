import { encryptSecret } from "@calcom/lib/crypto/keyring";

export type CredentialCreateData = {
  type: string;
  key: object;
  userId: number;
  appId: string;
  delegationCredentialId?: string | null;
  encryptedKey?: string | null;
};

/**
 * Builds the data object for creating a credential, including the encrypted key.
 * This service handles the encryption logic so the repository stays focused on data access.
 *
 * @param data The credential data without encryptedKey
 * @returns The credential data with encryptedKey populated if encryption key is available
 */
export function buildCredentialCreateData(data: {
  type: string;
  key: object;
  userId: number;
  appId: string;
  delegationCredentialId?: string | null;
}): CredentialCreateData {
  const aad = {
    type: data.type,
  };

  let encryptedKey: ReturnType<typeof encryptSecret> | null = null;
  try {
    encryptedKey = encryptSecret({ ring: "CREDENTIALS", plaintext: JSON.stringify(data.key), aad });
  } catch {
    // Encryption keyring not configured - this is expected in tests and some environments
    // The encryptedKey will be null, which is fine for backwards compatibility
  }

  return {
    ...data,
    key: data.key,
    ...(encryptedKey && { encryptedKey: JSON.stringify(encryptedKey) }),
  };
}
