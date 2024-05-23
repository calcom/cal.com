import crypto from "crypto";
import { z } from "zod";

const ALGORITHM = "aes256";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "hex";
const IV_LENGTH = 16; // AES blocksize

const { CALENDSO_ENCRYPTION_KEY, CALENDSO_OLD_ENCRYPTION_KEY } = process.env;

if (!CALENDSO_ENCRYPTION_KEY) {
  throw new Error("CALENDSO_ENCRYPTION_KEY is required");
}

/**
 * Encrypts the given text using symmetric encryption.
 * @param text The text to be encrypted.
 * @param opts Optional parameters.
 * @param opts.key The encryption key. If not provided, the default key will be used.
 * @returns The encrypted ciphertext.
 */
export const symmetricEncrypt = function (text: string, opts?: { key: string }) {
  const key = opts?.key || CALENDSO_ENCRYPTION_KEY;
  // if the key is 32 bytes, it's a latin1 string (legacy key), otherwise it's a base64 string
  const _key = Buffer.from(key, key.length === 32 ? "latin1" : "base64");
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, _key, iv);
  let ciphered = cipher.update(text, INPUT_ENCODING, OUTPUT_ENCODING);
  ciphered += cipher.final(OUTPUT_ENCODING);
  const ciphertext = `${iv.toString(OUTPUT_ENCODING)}:${ciphered}`;

  return ciphertext;
};

/**
 * Decrypts a symmetrically encrypted text using the specified options.
 *
 * @param text The encrypted text to decrypt.
 * @param opts The decryption options.
 * @param opts.schema The schema to parse the decrypted result.
 * @param [opts.key] The encryption key. Must be 32 bytes for AES256 encryption algorithm.
 *                   If not provided, the default key will be used.
 * @param [opts.encoding] The encoding of the encrypted text and key. Defaults to "base64".
 * @param [opts.onShouldUpdate] A callback function to be called if the value needs to be
 *                              re-encrypted using a new key.
 * @returns The decrypted result.
 * @throws If decryption or parsing fails.
 */
export const symmetricDecrypt = function <TOut>(
  text: string,
  opts: {
    schema: z.ZodSchema<TOut>;
    key?: string;
    onShouldUpdate?: (result: TOut) => void;
  }
): TOut {
  // If no key is specified, default to CALENDSO_ENCRYPTION_KEY
  const key = opts.key || CALENDSO_ENCRYPTION_KEY;

  // If the key is 32 characters, it's a latin1 string (legacy key), otherwise it's a base64 string
  const encoding = key.length === 32 ? "latin1" : "base64";

  const _key = Buffer.from(key, encoding);
  const components = text.split(":");
  const iv_from_ciphertext = Buffer.from(components.shift() || "", OUTPUT_ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, _key, iv_from_ciphertext);

  let deciphered = decipher.update(components.join(":"), OUTPUT_ENCODING, INPUT_ENCODING);
  deciphered += decipher.final(INPUT_ENCODING);

  // Parsing the deciphered result using the specified schema
  const { schema } = opts;
  const result = schema.safeParse(
    schema instanceof z.ZodObject || schema instanceof z.ZodArray ? JSON.parse(deciphered) : deciphered
  );

  // If parsing succeeds, return the result
  if (result.success) {
    // Convenience callback if the value needs to be re-encrypted using the new key
    if (key === CALENDSO_OLD_ENCRYPTION_KEY) {
      opts.onShouldUpdate?.(result.data);
    }

    return result.data;
  }

  // Otherwise, if the new key was used, retry with the old key if it is available
  if (key === CALENDSO_ENCRYPTION_KEY && !!CALENDSO_OLD_ENCRYPTION_KEY) {
    return symmetricDecrypt(text, {
      schema: schema,
      key: CALENDSO_OLD_ENCRYPTION_KEY,
    });
  }

  // If parsing still fails, even after retrying with the old key, throw an error
  throw new Error(result.error.issues.map((issue) => issue.message).join(", "));
};
