import { Authenticator, TOTP } from "@otplib/core";
import type { AuthenticatorOptions } from "@otplib/core/authenticator";
import type { TOTPOptions } from "@otplib/core/totp";
import { createDigest, createRandomBytes } from "@otplib/plugin-crypto";
import { keyDecoder, keyEncoder } from "@otplib/plugin-thirty-two";

/**
 * Checks the validity of a TOTP token using a base32-encoded secret.
 *
 * @param token - The token.
 * @param secret - The base32-encoded shared secret.
 * @param opts - The AuthenticatorOptions object.
 * @param opts.window - The amount of past and future tokens considered valid. Either a single value or array of `[past, future]`. Default: `[1, 0]`
 */
export const totpAuthenticatorCheck = (
  token: string,
  secret: string,
  opts: Partial<AuthenticatorOptions> = {}
) => {
  const { window = [1, 0], ...rest } = opts;
  const authenticator = new Authenticator({
    createDigest,
    createRandomBytes,
    keyDecoder,
    keyEncoder,
    window,
    ...rest,
  });
  return authenticator.check(token, secret);
};

/**
 * Checks the validity of a TOTP token using a raw secret.
 *
 * @param token - The token.
 * @param secret - The raw hex-encoded shared secret.
 * @param opts - The TOTPOptions object.
 * @param opts.window - The amount of past and future tokens considered valid. Either a single value or array of `[past, future]`. Default: `[1, 0]`
 */
export const totpRawCheck = (token: string, secret: string, opts: Partial<TOTPOptions> = {}) => {
  const { window = [1, 0], ...rest } = opts;
  const authenticator = new TOTP({
    createDigest,
    window,
    ...rest,
  });
  return authenticator.check(token, secret);
};
