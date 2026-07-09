/**
 * JWT session revocation on password change.
 *
 * A NextAuth JWT carries an `iat` (issued-at) claim in SECONDS. When a user
 * changes their password we stamp `User.passwordChangedAt` (a Date, milliseconds).
 * Any token issued at or before that moment must be treated as revoked, so a
 * stolen pre-change token cannot keep authenticating.
 *
 *   ... token issued ───●───────────────●─────────▶ time
 *                        iat (s)         passwordChangedAt (ms)
 *                        └─ tokens with iat <= passwordChangedAt are REVOKED ─┘
 *
 * `passwordChangedAt == null` means the password was never changed (or predates
 * this feature), so we never revoke — existing sessions are not mass-invalidated.
 *
 * The comparison is `<=` (fail closed): a token minted in the same whole second
 * as the change is treated as revoked. A re-login in a later second gets an `iat`
 * strictly greater than passwordChangedAt and survives; a re-login within the same
 * second is briefly treated as revoked until the next issued token, which is the
 * safe direction to err.
 *
 * `tokenIatSeconds` is typed `unknown` because NextAuth's `JWT["iat"]` resolves
 * through the JWT index signature (it isn't a declared field), so callers pass it
 * straight through. A missing/non-numeric/zero `iat` returns false (not revoked),
 * matching the prior behavior of guarding on a truthy `token.iat`.
 */
export function isJwtIssuedBeforePasswordChange(
  tokenIatSeconds: unknown,
  passwordChangedAt: Date | null | undefined
): boolean {
  if (!passwordChangedAt || typeof tokenIatSeconds !== "number" || !tokenIatSeconds) {
    return false;
  }
  const passwordChangedAtSeconds = Math.floor(passwordChangedAt.getTime() / 1000);
  return tokenIatSeconds <= passwordChangedAtSeconds;
}
