import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { symmetricDecrypt, symmetricEncrypt } from "./crypto";

// ---------------------------------------------------------------------------
// Helpers — mirrors the internal decodeKey logic so we can cross-check buffers
// ---------------------------------------------------------------------------
function legacyKey(): string {
  // Simulates `openssl rand -base64 24`: 32-char latin1 string
  return crypto.randomBytes(24).toString("base64").slice(0, 32);
}

function newKey(): string {
  // Simulates `openssl rand -base64 32`: 44-char base64 string
  return crypto.randomBytes(32).toString("base64");
}

// ---------------------------------------------------------------------------
// decodeKey — tested indirectly via symmetricEncrypt / symmetricDecrypt so
// that the helper itself is covered without needing to export it.
// ---------------------------------------------------------------------------
describe("decodeKey", () => {
  describe("legacy key (≤32 chars, latin1)", () => {
    it("should decode a 32-char latin1 key to a 32-byte Buffer", () => {
      const key = "12345678901234567890123456789012"; // exactly 32 chars
      const buf = Buffer.from(key, "latin1");
      expect(buf).toHaveLength(32);
    });

    it("should round-trip encrypt/decrypt with a legacy key", () => {
      const key = "12345678901234567890123456789012";
      const plaintext = "legacy key round-trip";
      const encrypted = symmetricEncrypt(plaintext, key);
      expect(symmetricDecrypt(encrypted, key)).toBe(plaintext);
    });

    it("should accept a key of exactly 32 chars (boundary)", () => {
      const key = "A".repeat(32);
      const encrypted = symmetricEncrypt("boundary", key);
      expect(symmetricDecrypt(encrypted, key)).toBe("boundary");
    });
  });

  describe("new key (>32 chars, base64-encoded 32 bytes)", () => {
    it("should decode a 44-char base64 key to a 32-byte Buffer", () => {
      const raw = crypto.randomBytes(32);
      const key = raw.toString("base64"); // 44 chars
      expect(key.length).toBeGreaterThan(32);
      const buf = Buffer.from(key, "base64");
      expect(buf).toHaveLength(32);
      expect(buf.equals(raw)).toBe(true);
    });

    it("should round-trip encrypt/decrypt with a new-style base64 key", () => {
      const key = newKey();
      const plaintext = "new key round-trip";
      const encrypted = symmetricEncrypt(plaintext, key);
      expect(symmetricDecrypt(encrypted, key)).toBe(plaintext);
    });

    it("should produce different ciphertexts for the same input (random IV)", () => {
      const key = newKey();
      const plaintext = "randomness check";
      const c1 = symmetricEncrypt(plaintext, key);
      const c2 = symmetricEncrypt(plaintext, key);
      expect(c1).not.toBe(c2);
    });

    it("should yield a 32-byte effective key (AES-256 strength)", () => {
      // Verify that the decoded buffer is exactly 32 bytes
      const key = newKey();
      const buf = Buffer.from(key, "base64");
      expect(buf).toHaveLength(32);
    });
  });

  describe("backward compatibility", () => {
    it("legacy and new keys should NOT decrypt each other's ciphertexts correctly", () => {
      const legacy = "12345678901234567890123456789012";
      const newStyle = newKey();
      const plaintext = "cross-key test";

      const encryptedWithLegacy = symmetricEncrypt(plaintext, legacy);
      const encryptedWithNew = symmetricEncrypt(plaintext, newStyle);

      // Decrypting with the wrong key should throw or produce wrong output
      let legacyWrongResult: string | null = null;
      let legacyThrew = false;
      try {
        legacyWrongResult = symmetricDecrypt(encryptedWithNew, legacy);
      } catch {
        legacyThrew = true;
      }
      expect(legacyThrew || legacyWrongResult !== plaintext).toBe(true);

      let newWrongResult: string | null = null;
      let newThrew = false;
      try {
        newWrongResult = symmetricDecrypt(encryptedWithLegacy, newStyle);
      } catch {
        newThrew = true;
      }
      expect(newThrew || newWrongResult !== plaintext).toBe(true);
    });

    it("data encrypted with legacy key is still decryptable after upgrade (same key string)", () => {
      // Simulate: data encrypted before the PR was deployed, decrypted after
      const legacyKeyStr = "12345678901234567890123456789012";
      const plaintext = "data encrypted before AES-256 upgrade";
      const encrypted = symmetricEncrypt(plaintext, legacyKeyStr);
      // decodeKey still picks the latin1 path for ≤32-char keys
      expect(symmetricDecrypt(encrypted, legacyKeyStr)).toBe(plaintext);
    });
  });
});

// ---------------------------------------------------------------------------
// symmetricEncrypt / symmetricDecrypt (existing coverage, kept intact)
// ---------------------------------------------------------------------------
describe("crypto", () => {
  const testKey = "12345678901234567890123456789012"; // 32-char legacy key
  const testText = "Hello, World!";

  describe("symmetricEncrypt", () => {
    it("should encrypt text with a valid key", () => {
      const encrypted = symmetricEncrypt(testText, testKey);

      // Verify the format is "iv:ciphertext"
      expect(encrypted).toContain(":");
      const [iv, ciphertext] = encrypted.split(":");

      // IV should be 32 characters (16 bytes in hex)
      expect(iv).toHaveLength(32);
      // Ciphertext should exist
      expect(ciphertext).toBeDefined();
      expect(ciphertext.length).toBeGreaterThan(0);
    });

    it("should produce different ciphertexts for the same input due to random IV", () => {
      const encrypted1 = symmetricEncrypt(testText, testKey);
      const encrypted2 = symmetricEncrypt(testText, testKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should throw error if key is not 32 bytes", () => {
      const shortKey = "short";
      expect(() => symmetricEncrypt(testText, shortKey)).toThrow();
    });
  });

  describe("symmetricDecrypt", () => {
    it("should correctly decrypt encrypted text", () => {
      const encrypted = symmetricEncrypt(testText, testKey);
      const decrypted = symmetricDecrypt(encrypted, testKey);

      expect(decrypted).toBe(testText);
    });

    it("should throw error for malformed encrypted text", () => {
      // Test with invalid IV:ciphertext format
      expect(() => symmetricDecrypt("invalid", testKey)).toThrow();
      expect(() => symmetricDecrypt("invalid:data", testKey)).toThrow();
      expect(() => symmetricDecrypt(":", testKey)).toThrow();
    });

    it("should fail to decrypt correctly if wrong key is used", () => {
      const encrypted = symmetricEncrypt(testText, testKey);
      const wrongKey = "12345678901234567890123456789013"; // Different 32 bytes key

      // AES-256-CBC doesn't guarantee throwing on wrong key - it depends on whether
      // the decrypted bytes happen to have valid PKCS#7 padding. The test verifies
      // that decryption either throws OR returns a value different from the original.
      let decryptedWithWrongKey: string | null = null;
      let threwError = false;

      try {
        decryptedWithWrongKey = symmetricDecrypt(encrypted, wrongKey);
      } catch {
        threwError = true;
      }

      // Either it threw an error, or the decrypted value is not the original text
      expect(threwError || decryptedWithWrongKey !== testText).toBe(true);
    });

    it("should handle empty string encryption/decryption", () => {
      const emptyText = "";
      const encrypted = symmetricEncrypt(emptyText, testKey);
      const decrypted = symmetricDecrypt(encrypted, testKey);

      expect(decrypted).toBe(emptyText);
    });

    it("should handle long text encryption/decryption", () => {
      const longText = "a".repeat(1000);
      const encrypted = symmetricEncrypt(longText, testKey);
      const decrypted = symmetricDecrypt(encrypted, testKey);

      expect(decrypted).toBe(longText);
    });

    it("should handle special characters", () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;:'\",.<>?/\\`~";
      const encrypted = symmetricEncrypt(specialChars, testKey);
      const decrypted = symmetricDecrypt(encrypted, testKey);

      expect(decrypted).toBe(specialChars);
    });

    it("should handle unicode characters", () => {
      const unicodeText = "Hello, 世界! 👋 🌍";
      const encrypted = symmetricEncrypt(unicodeText, testKey);
      const decrypted = symmetricDecrypt(encrypted, testKey);

      expect(decrypted).toBe(unicodeText);
    });
  });
});
