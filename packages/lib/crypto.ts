import crypto from "node:crypto";

const ALGORITHM = "aes256";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "hex";
const IV_LENGTH = 16; // AES blocksize

function decryptWithKeyEncoding(
  ciphertext: string,
  ivHex: string,
  key: string,
  encoding: BufferEncoding
): string {
  const keyBuffer = Buffer.from(key, encoding);
  const iv = Buffer.from(ivHex, OUTPUT_ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  let deciphered = decipher.update(ciphertext, OUTPUT_ENCODING, INPUT_ENCODING);
  deciphered += decipher.final(INPUT_ENCODING);
  return deciphered;
}

/**
 *
 * @param text Value to be encrypted
 * @param key Key used to encrypt value must be 32 bytes for AES256 encryption algorithm
 *
 * @returns Encrypted value using key
 */
export function symmetricEncrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key, "base64");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let ciphered = cipher.update(text, INPUT_ENCODING, OUTPUT_ENCODING);
  ciphered += cipher.final(OUTPUT_ENCODING);

  return `${iv.toString(OUTPUT_ENCODING)}:${ciphered}`;
}

/**
 *
 * @param text Value to decrypt
 * @param key Key used to decrypt value must be 32 bytes for AES256 encryption algorithm
 *
 * Tries base64 key encoding first, falls back to latin1 for legacy encrypted data
 */
export function symmetricDecrypt(text: string, key: string): string {
  const components = text.split(":");
  const ivHex = components.shift() || "";
  const ciphertext = components.join(":");

  try {
    return decryptWithKeyEncoding(ciphertext, ivHex, key, "base64");
  } catch {
    return decryptWithKeyEncoding(ciphertext, ivHex, key, "latin1");
  }
}
