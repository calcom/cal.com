import crypto from "crypto";

const ALGORITHM = "aes256";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "hex";
const IV_LENGTH = 16; // AES blocksize

export const symmetricEncrypt = function (text, key) {
  const _key = Buffer.from(key, "latin1");
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, _key, iv);
  let ciphered = cipher.update(text, INPUT_ENCODING, OUTPUT_ENCODING);
  ciphered += cipher.final(OUTPUT_ENCODING);
  const ciphertext = iv.toString(OUTPUT_ENCODING) + ":" + ciphered;

  return ciphertext;
};
export const symmetricDecrypt = function (text, key) {
  const _key = Buffer.from(key, "latin1"); // key must be 32 bytes for aes256

  const components = text.split(":");
  const iv_from_ciphertext = Buffer.from(components.shift(), OUTPUT_ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, _key, iv_from_ciphertext);
  let deciphered = decipher.update(components.join(":"), OUTPUT_ENCODING, INPUT_ENCODING);
  deciphered += decipher.final(INPUT_ENCODING);

  return deciphered;
};
