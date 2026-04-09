import { WEBAPP_URL } from "@calcom/lib/constants";

export function normalizeCallbackUrl(callbackUrl: string): string {
  if (!callbackUrl) return `${WEBAPP_URL}/`;

  if (/^https?:\/\//.test(callbackUrl)) {
    return callbackUrl;
  }

  const normalizedPath = callbackUrl.startsWith("/") ? callbackUrl.slice(1) : callbackUrl;
  return `${WEBAPP_URL}/${normalizedPath}`;
}
