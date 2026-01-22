import crypto from "node:crypto";
import process from "node:process";

const ALGORITHM = "aes256";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "hex";
const IV_LENGTH = 16; // AES blocksize

/**
 *
 * @param text Value to be encrypted
 * @param key Key used to encrypt value must be 32 bytes for AES256 encryption algorithm
 *
 * @returns Encrypted value using key
 */
export const symmetricEncrypt = function (text: string, key: string) {
  const _key = Buffer.from(key, "latin1");
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
  const _key = Buffer.from(key, "latin1");

  const components = text.split(":");
  const iv_from_ciphertext = Buffer.from(components.shift() || "", OUTPUT_ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, _key, iv_from_ciphertext);
  let deciphered = decipher.update(components.join(":"), OUTPUT_ENCODING, INPUT_ENCODING);
  deciphered += decipher.final(INPUT_ENCODING);

  return deciphered;
};

/**
 * Creates an encrypted version of a credential key for storage.
 * Uses CALENDSO_ENCRYPTION_KEY environment variable for encryption.
 *
 * @param key The credential key object or value to encrypt
 * @returns The encrypted key string, or null if encryption key is not available
 */
export const createEncryptedKey = (key: unknown): string | null => {
  const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
  if (!encryptionKey) {
    return null;
  }

  const keyString = typeof key === "string" ? key : JSON.stringify(key);
  return symmetricEncrypt(keyString, encryptionKey);
};
