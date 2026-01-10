import crypto from "node:crypto";

const ALGORITHM = "aes256";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "hex";
const IV_LENGTH = 16; // AES blocksize

/**
 * @param text Value to be encrypted
 * @param key Key used to encrypt value must be 32 bytes for AES256 encryption algorithm
 * @returns Encrypted value using key
 */
export function symmetricEncrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key, "base64");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  const ciphered = cipher.update(text, INPUT_ENCODING, OUTPUT_ENCODING) + cipher.final(OUTPUT_ENCODING);

  return `${iv.toString(OUTPUT_ENCODING)}:${ciphered}`;
}

/**
 * @param text Value to decrypt
 * @param key Key used to decrypt value must be 32 bytes for AES256 encryption algorithm
 * @returns Decrypted value
 */
export function symmetricDecrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key, "base64");
  const [ivHex, ...cipherParts] = text.split(":");
  const iv = Buffer.from(ivHex, OUTPUT_ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  const deciphered = decipher.update(cipherParts.join(":"), OUTPUT_ENCODING, INPUT_ENCODING) + decipher.final(INPUT_ENCODING);

  return deciphered;
}
