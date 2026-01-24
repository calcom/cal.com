import { encryptSecret } from "@calcom/lib/crypto/keyring";

type JsonPrimitive = string | number | boolean | null;

type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type CredentialKey = JsonValue;

export type CredentialCreateData = {
  type: string;
  key: CredentialKey;
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
  const aad = {
    type: data.type,
  };
  const encryptedKey = encryptSecret({ ring: "CREDENTIALS", plaintext: JSON.stringify(data.key), aad });

  return {
    ...data,
    key: data.key,
    ...(encryptedKey && { encryptedKey: JSON.stringify(encryptedKey) }),
  };
}
