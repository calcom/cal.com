import type { NextRequest } from "next/server";

/**
 * Returns true when the incoming cron request carries a recognised credential.
 *
 * Accepts either:
 *  • A plain `CRON_API_KEY` query-param / Authorization header value, or
 *  • A `Bearer <CRON_SECRET>` Authorization header.
 *
 * If the environment variable is undefined the corresponding key is excluded
 * from the allow-list so that `Bearer undefined` can never match.
 */
export function isValidCronRequest(req: NextRequest): boolean {
  const apiKey = req.headers.get("authorization") ?? req.nextUrl.searchParams.get("apiKey");
  const validKeys = [
    process.env.CRON_API_KEY,
    process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined,
  ].filter((k): k is string => !!k);

  return validKeys.length > 0 && validKeys.includes(apiKey ?? "");
}
