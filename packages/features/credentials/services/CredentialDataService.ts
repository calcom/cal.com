import { symmetricEncrypt } from "@calcom/lib/crypto";

type CredentialKey = object | string;

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
  key: CredentialKey;
  userId: number;
  appId: string;
  delegationCredentialId?: string | null;
}): CredentialCreateData {
  const encryptedKey = createEncryptedKey(data.key);
  const keyObject = typeof data.key === "string" ? JSON.parse(data.key) : data.key;

  return {
    ...data,
    key: keyObject,
    ...(encryptedKey && { encryptedKey }),
  };
}

/**
 * Creates an encrypted version of a credential key for storage.
 * Uses CALENDSO_ENCRYPTION_KEY environment variable for encryption.
 *
 * @param key The credential key object or value to encrypt
 * @returns The encrypted key string, or null if encryption key is not available
 */
function createEncryptedKey(key: CredentialKey): string | null {
  const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
  if (!encryptionKey) {
    return null;
  }

  const keyString = typeof key === "string" ? key : JSON.stringify(key);
  return symmetricEncrypt(keyString, encryptionKey);
}
