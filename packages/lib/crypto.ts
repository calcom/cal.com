import crypto from "node:crypto";

const ALGORITHM = "aes256";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "hex";
const IV_LENGTH = 16; // AES blocksize

/**
 * Decode encryption key, auto-detecting encoding.
 *
 * New keys (generated with `openssl rand -base64 32`) are 44 chars and
 * base64-encoded, yielding 32 true random bytes (AES-256).
 *
 * Legacy keys (generated with `openssl rand -base64 24`) are 32 chars and
 * were decoded as latin1, yielding only ~192 bits of effective entropy.
 *
 * This helper preserves backward compatibility while encouraging migration
 * to full-strength AES-256 keys.
 */
function decodeKey(key: string): Buffer {
  // Base64 of 32 bytes = 44 chars (with padding) or 43 chars (without)
  // Latin1 keys from `openssl rand -base64 24` are exactly 32 chars
  if (key.length > 32) {
    // New-style: base64-encoded 32 random bytes
    return Buffer.from(key, "base64");
  }
  // Legacy: treat as latin1 (backward compatible)
  return Buffer.from(key, "latin1");
}

/**
 *
 * @param text Value to be encrypted
 * @param key Key used to encrypt value must be 32 bytes for AES256 encryption algorithm
 *
 * @returns Encrypted value using key
 */
export const symmetricEncrypt = function (text: string, key: string) {
  const _key = decodeKey(key);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, _key, iv);
  let ciphered = cipher.update(text, INPUT_ENCODING, OUTPUT_ENCODING);
  ciphered += cipher.final(OUTPUT_ENCODING);
  const ciphertext = `${iv.toString(OUTPUT_ENCODING)}:${ciphered}`;

  return ciphertext;
};

/**
 *
 * @param text Value to decrypt
 * @param key Key used to decrypt value must be 32 bytes for AES256 encryption algorithm
 */
export const symmetricDecrypt = function (text: string, key: string) {
  const _key = decodeKey(key);

  const components = text.split(":");
  const iv_from_ciphertext = Buffer.from(components.shift() || "", OUTPUT_ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, _key, iv_from_ciphertext);
  let deciphered = decipher.update(components.join(":"), OUTPUT_ENCODING, INPUT_ENCODING);
  deciphered += decipher.final(INPUT_ENCODING);

  return deciphered;
};
