import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSymmetricEncrypt = vi.fn();
const mockSymmetricDecrypt = vi.fn();

vi.mock("@calcom/lib/constants", () => ({
  SERVICE_ACCOUNT_ENCRYPTION_KEY: "test-encryption-key-32chars-long!",
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricEncrypt: (...args: unknown[]) => mockSymmetricEncrypt(...args),
  symmetricDecrypt: (...args: unknown[]) => mockSymmetricDecrypt(...args),
}));

vi.mock("@calcom/prisma/zod-utils", () => {
  const { z } = require("zod");
  return {
    serviceAccountKeySchema: z
      .object({
        client_email: z.string().optional(),
        client_id: z.string(),
        private_key: z.string(),
        tenant_id: z.string().optional(),
      })
      .passthrough(),
  };
});

import {
  decryptServiceAccountKey,
  encryptedServiceAccountKeySchema,
  encryptServiceAccountKey,
} from "./serviceAccountKey";

describe("encryptedServiceAccountKeySchema", () => {
  it("validates a correct encrypted key object", () => {
    const result = encryptedServiceAccountKeySchema.safeParse({
      client_id: "client-123",
      encrypted_credentials: "encrypted-data",
    });
    expect(result.success).toBe(true);
  });

  it("requires client_id", () => {
    const result = encryptedServiceAccountKeySchema.safeParse({
      encrypted_credentials: "encrypted-data",
    });
    expect(result.success).toBe(false);
  });

  it("requires encrypted_credentials", () => {
    const result = encryptedServiceAccountKeySchema.safeParse({
      client_id: "client-123",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional client_email and tenant_id", () => {
    const result = encryptedServiceAccountKeySchema.safeParse({
      client_id: "client-123",
      encrypted_credentials: "encrypted-data",
      client_email: "test@example.com",
      tenant_id: "tenant-456",
    });
    expect(result.success).toBe(true);
  });
});

describe("encryptServiceAccountKey", () => {
  beforeEach(() => {
    mockSymmetricEncrypt.mockReset();
    mockSymmetricDecrypt.mockReset();
  });

  it("encrypts the private_key and returns encrypted format", () => {
    mockSymmetricEncrypt.mockReturnValue("encrypted-blob");

    const result = encryptServiceAccountKey({
      client_id: "client-123",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nSECRET\n-----END PRIVATE KEY-----\n",
    });

    expect(result.client_id).toBe("client-123");
    expect(result.client_email).toBe("sa@project.iam.gserviceaccount.com");
    expect(result.encrypted_credentials).toBe("encrypted-blob");
    expect(result).not.toHaveProperty("private_key");
  });

  it("passes stringified private_key to symmetricEncrypt", () => {
    mockSymmetricEncrypt.mockReturnValue("encrypted");

    encryptServiceAccountKey({
      client_id: "c1",
      private_key: "my-private-key",
    });

    expect(mockSymmetricEncrypt).toHaveBeenCalledWith(
      JSON.stringify({ private_key: "my-private-key" }),
      "test-encryption-key-32chars-long!"
    );
  });
});

describe("decryptServiceAccountKey", () => {
  beforeEach(() => {
    mockSymmetricEncrypt.mockReset();
    mockSymmetricDecrypt.mockReset();
  });

  it("decrypts and returns the full service account key", () => {
    mockSymmetricDecrypt.mockReturnValue(JSON.stringify({ private_key: "decrypted-key" }));

    const result = decryptServiceAccountKey({
      client_id: "client-123",
      encrypted_credentials: "encrypted-blob",
    });

    expect(result.client_id).toBe("client-123");
    expect(result.private_key).toBe("decrypted-key");
  });

  it("throws when encrypted format is invalid", () => {
    expect(() => decryptServiceAccountKey({ invalid: "data" })).toThrow(
      "Failed to decrypt service account key"
    );
  });

  it("throws when decryption fails", () => {
    mockSymmetricDecrypt.mockImplementation(() => {
      throw new Error("Decryption failed");
    });

    expect(() =>
      decryptServiceAccountKey({
        client_id: "client-123",
        encrypted_credentials: "bad-encrypted-data",
      })
    ).toThrow("Failed to decrypt service account key: Decryption failed");
  });

  it("throws when decrypted data fails schema validation", () => {
    mockSymmetricDecrypt.mockReturnValue(JSON.stringify({ wrong_field: "value" }));

    expect(() =>
      decryptServiceAccountKey({
        client_id: "client-123",
        encrypted_credentials: "encrypted-blob",
      })
    ).toThrow("Failed to decrypt service account key");
  });
});
