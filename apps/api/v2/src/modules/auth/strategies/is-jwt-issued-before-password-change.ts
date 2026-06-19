/**
 * JWT session revocation on password change (API v2 copy).
 *
 * A NextAuth JWT carries an `iat` (issued-at) claim in SECONDS. When a user
 * changes their password, `User.passwordChangedAt` (a Date, milliseconds) is
 * stamped. Any token issued at or before that moment must be treated as revoked,
 * so a stolen pre-change token cannot keep authenticating against the API.
 *
 * `passwordChangedAt == null` means the password was never changed (or predates
 * this feature), so we never revoke. The comparison is `<=` (fail closed): a
 * token minted in the same whole second as the change is revoked; a re-login in a
 * later second gets a strictly greater `iat` and survives.
 *
 * NOTE: this only catches tokens still carrying a pre-change `iat`. NextAuth rotates
 * `iat` forward on session refresh, so the strategies also reject tokens flagged with
 * error "SessionInvalidated" by the web jwt callback (which is sticky across refreshes).
 *
 * This is intentionally duplicated from `@calcom/lib/auth/isJwtIssuedBeforePasswordChange`
 * rather than imported: the API v2 NestJS app does not otherwise depend on
 * `@calcom/lib`, and a one-function pure helper is cheaper to copy than to wire a
 * new cross-package dependency into its build graph.
 *
 * `tokenIatSeconds` is `unknown` because NextAuth's `JWT["iat"]` resolves through
 * the JWT index signature. A missing/non-numeric/zero `iat` returns false.
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
