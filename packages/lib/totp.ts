import { Authenticator } from "@otplib/core";
import { createDigest, createRandomBytes } from "@otplib/plugin-crypto";
import { keyDecoder, keyEncoder } from "@otplib/plugin-thirty-two";

/**
 * Checks the validity of a TOTP token.
 *
 * @param token - The token.
 * @param secret - The shared secret.
 * @param window - The amount of past and future tokens to be considered valid. Default: [1, 0]
 */
export const totpCheck = (
  token: string,
  secret: string,
  window: number | [past: number, future: number] = [1, 0]
) => {
  const authenticator = new Authenticator({
    createDigest,
    createRandomBytes,
    keyDecoder,
    keyEncoder,
    window,
  });
  return authenticator.check(token, secret);
};
