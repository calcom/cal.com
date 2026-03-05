import type { ApiVersion } from "./constants";

interface AuthHeaders {
  Authorization: string;
}

interface VersionedHeaders extends AuthHeaders {
  "cal-api-version": string;
}

// Authorization header is populated by the client interceptor at runtime
export function authHeader(): AuthHeaders {
  return { Authorization: "" };
}

export function apiVersionHeader(version: ApiVersion): VersionedHeaders {
  return { Authorization: "", "cal-api-version": version };
}
