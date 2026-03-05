import type { ApiVersion } from "./constants";

interface VersionedHeaders {
  Authorization: string;
  "cal-api-version": string;
}

/**
 * The Authorization header is set by the interceptor at runtime.
 */
export function apiVersionHeader(version: ApiVersion): VersionedHeaders {
  return {
    Authorization: "",
    "cal-api-version": version,
  };
}
