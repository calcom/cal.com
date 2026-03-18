import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

export const MAX_REDIRECT_URIS = 10;

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLoopbackAddress(hostname: string): boolean {
  return LOOPBACK_HOSTNAMES.has(hostname) || hostname.endsWith(".local");
}

export function validateRedirectUri(uri: string): string | true {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return "Invalid URL";
  }

  if (parsed.hash) {
    return "URL fragments are not allowed in redirect URIs";
  }

  if (parsed.protocol === "https:") {
    return true;
  }

  if (parsed.protocol === "http:" && isLoopbackAddress(parsed.hostname)) {
    return true;
  }

  return "HTTPS is required for redirect URIs (HTTP is only allowed for localhost, 127.0.0.1, [::1], and .local domains)";
}

export function validateRedirectUris(uris: string[]): void {
  if (uris.length === 0) {
    throw new ErrorWithCode(ErrorCode.BadRequest, "At least one redirect URI is required");
  }

  if (uris.length > MAX_REDIRECT_URIS) {
    throw new ErrorWithCode(ErrorCode.BadRequest, `A maximum of ${MAX_REDIRECT_URIS} redirect URIs are allowed`);
  }

  const seen = new Set<string>();
  for (const uri of uris) {
    const result = validateRedirectUri(uri);
    if (result !== true) {
      throw new ErrorWithCode(ErrorCode.BadRequest, `${result}: ${uri}`);
    }
    if (seen.has(uri)) {
      throw new ErrorWithCode(ErrorCode.BadRequest, `Duplicate redirect URI: ${uri}`);
    }
    seen.add(uri);
  }
}

export function isRedirectUriRegistered(redirectUri: string, registeredUris: string[]): boolean {
  return registeredUris.includes(redirectUri);
}
