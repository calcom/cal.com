/**
 * Extracts a Bearer token from an Authorization header value.
 *
 * This utility handles various edge cases:
 * - Case-insensitive "Bearer" scheme matching (Bearer, bearer, BEARER, etc.)
 * - Leading/trailing whitespace in the header
 * - Extra whitespace between "Bearer" and the token
 * - Empty or whitespace-only tokens (treated as absent)
 * - Empty or whitespace-only Authorization headers (treated as absent)
 *
 * @param authHeader - The value of the Authorization header
 * @returns The extracted Bearer token, or undefined if not present or invalid
 *
 * @example
 * extractBearerToken("Bearer token123") // "token123"
 * extractBearerToken("bearer token123") // "token123"
 * extractBearerToken("  Bearer  token123  ") // "token123"
 * extractBearerToken("Bearer ") // undefined
 * extractBearerToken("") // undefined
 * extractBearerToken("   ") // undefined
 * extractBearerToken("Basic xyz") // undefined
 */
export function extractBearerToken(authHeader: string | undefined | null): string | undefined {
  // Treat empty, null, undefined, or whitespace-only headers as absent
  if (!authHeader || !authHeader.trim()) {
    return undefined;
  }

  // Case-insensitive Bearer scheme matching with flexible whitespace
  const bearerMatch = authHeader.match(/^\s*Bearer\s+(.+)\s*$/i);
  if (!bearerMatch) {
    return undefined;
  }

  const extractedToken = bearerMatch[1].trim();

  // Treat zero-length tokens as absent
  return extractedToken.length > 0 ? extractedToken : undefined;
}
