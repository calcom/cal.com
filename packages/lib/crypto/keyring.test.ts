import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { decryptSecret, encryptSecret, getKeyMaterial, decryptAndMaybeReencrypt } from "./keyring";

// Generate a valid 32-byte key encoded as base64url
const TEST_KEY_K1 = Buffer.from("a]".repeat(16)).toString("base64url"); // 32 bytes
const TEST_KEY_K2 = Buffer.from("b]".repeat(16)).toString("base64url"); // 32 bytes different key

describe("getKeyMaterial", () => {
  beforeEach(() => {
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_CURRENT", "K1");
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_K1", TEST_KEY_K1);
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_K2", TEST_KEY_K2);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a 32-byte Buffer for a valid key", () => {
    const key = getKeyMaterial("CREDENTIALS", "K1");
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
  });

  it("throws for unknown kid", () => {
    expect(() => getKeyMaterial("CREDENTIALS", "UNKNOWN")).toThrow("Unknown kid");
  });

  it("is case-insensitive for kid lookup (uppercases)", () => {
    const key = getKeyMaterial("CREDENTIALS", "k1");
    expect(key.length).toBe(32);
  });
});

describe("encryptSecret / decryptSecret round-trip", () => {
  beforeEach(() => {
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_CURRENT", "K1");
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_K1", TEST_KEY_K1);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts and decrypts a simple string", () => {
    const plaintext = "my-secret-credential";
    const aad = { userId: 123 };

    const envelope = encryptSecret({ ring: "CREDENTIALS", plaintext, aad });
    const decrypted = decryptSecret({ envelope, aad });

    expect(decrypted).toBe(plaintext);
  });

  it("produces a valid envelope structure", () => {
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext: "test",
      aad: { userId: 1 },
    });

    expect(envelope.v).toBe(1);
    expect(envelope.alg).toBe("AES-256-GCM");
    expect(envelope.ring).toBe("CREDENTIALS");
    expect(envelope.kid).toBe("K1");
    expect(typeof envelope.nonce).toBe("string");
    expect(typeof envelope.ct).toBe("string");
    expect(typeof envelope.tag).toBe("string");
  });

  it("produces different ciphertexts for same plaintext (random nonce)", () => {
    const params = { ring: "CREDENTIALS" as const, plaintext: "same-data", aad: { id: 1 } };
    const env1 = encryptSecret(params);
    const env2 = encryptSecret(params);

    expect(env1.ct).not.toBe(env2.ct);
    expect(env1.nonce).not.toBe(env2.nonce);
  });

  it("fails to decrypt with wrong AAD", () => {
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext: "secret",
      aad: { userId: 1 },
    });

    expect(() => decryptSecret({ envelope, aad: { userId: 2 } })).toThrow();
  });

  it("fails to decrypt with tampered ciphertext", () => {
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext: "secret",
      aad: { userId: 1 },
    });

    const tampered = { ...envelope, ct: "AAAA" };
    expect(() => decryptSecret({ envelope: tampered, aad: { userId: 1 } })).toThrow();
  });

  it("rejects unsupported envelope version", () => {
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext: "test",
      aad: { id: 1 },
    });

    const badVersion = { ...envelope, v: 99 as 1 };
    expect(() => decryptSecret({ envelope: badVersion, aad: { id: 1 } })).toThrow(
      "Unsupported envelope version"
    );
  });

  it("rejects unsupported algorithm", () => {
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext: "test",
      aad: { id: 1 },
    });

    const badAlg = { ...envelope, alg: "AES-128-CBC" as "AES-256-GCM" };
    expect(() => decryptSecret({ envelope: badAlg, aad: { id: 1 } })).toThrow(
      "Unsupported envelope algorithm"
    );
  });

  it("handles array AAD", () => {
    const plaintext = "array-aad-test";
    const aad = ["user", 123, true, null];

    const envelope = encryptSecret({ ring: "CREDENTIALS", plaintext, aad });
    const decrypted = decryptSecret({ envelope, aad });

    expect(decrypted).toBe(plaintext);
  });

  it("handles empty string plaintext", () => {
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext: "",
      aad: { id: 1 },
    });
    const decrypted = decryptSecret({ envelope, aad: { id: 1 } });
    expect(decrypted).toBe("");
  });

  it("handles unicode plaintext", () => {
    const plaintext = "🔐 secret with émojis and ñ";
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext,
      aad: { id: 1 },
    });
    expect(decryptSecret({ envelope, aad: { id: 1 } })).toBe(plaintext);
  });
});

describe("decryptAndMaybeReencrypt", () => {
  beforeEach(() => {
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_CURRENT", "K1");
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_K1", TEST_KEY_K1);
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_K2", TEST_KEY_K2);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null updatedEnvelope when kid matches current", () => {
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext: "data",
      aad: { id: 1 },
    });

    const result = decryptAndMaybeReencrypt({ envelope, aad: { id: 1 } });
    expect(result.plaintext).toBe("data");
    expect(result.updatedEnvelope).toBeNull();
  });

  it("re-encrypts when kid does NOT match current", () => {
    // Encrypt with K2
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_CURRENT", "K2");
    const envelope = encryptSecret({
      ring: "CREDENTIALS",
      plaintext: "rotate-me",
      aad: { id: 1 },
    });
    expect(envelope.kid).toBe("K2");

    // Now switch current to K1
    vi.stubEnv("CALCOM_KEYRING_CREDENTIALS_CURRENT", "K1");

    const result = decryptAndMaybeReencrypt({ envelope, aad: { id: 1 } });

    expect(result.plaintext).toBe("rotate-me");
    expect(result.updatedEnvelope).not.toBeNull();
    expect(result.updatedEnvelope!.kid).toBe("K1");

    // Verify the re-encrypted envelope is valid
    const decrypted = decryptSecret({ envelope: result.updatedEnvelope!, aad: { id: 1 } });
    expect(decrypted).toBe("rotate-me");
  });
});
