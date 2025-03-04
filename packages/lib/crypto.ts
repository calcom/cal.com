import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
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
  const _key = new Uint8Array(crypto.createHash("sha256").update(key).digest());
  const iv = new Uint8Array(crypto.randomBytes(IV_LENGTH));

  const cipher = crypto.createCipheriv(ALGORITHM, _key, iv);
  let encrypted = cipher.update(text, INPUT_ENCODING, OUTPUT_ENCODING);
  encrypted += cipher.final(OUTPUT_ENCODING);

  return `${Buffer.from(iv).toString(OUTPUT_ENCODING)}:${encrypted}`;
};

/**
 *
 * @param text Value to decrypt
 * @param key Key used to decrypt value must be 32 bytes for AES256 encryption algorithm
 */
export const symmetricDecrypt = function (encryptedText: string, key: string) {
  const _key = new Uint8Array(crypto.createHash("sha256").update(key).digest());
  const [ivHex, encryptedHex] = encryptedText.split(":");

  const iv = new Uint8Array(Buffer.from(ivHex, OUTPUT_ENCODING));
  const decipher = crypto.createDecipheriv(ALGORITHM, _key, iv);

  let decrypted = decipher.update(encryptedHex, OUTPUT_ENCODING, INPUT_ENCODING);
  decrypted += decipher.final(INPUT_ENCODING);

  return decrypted;
};
