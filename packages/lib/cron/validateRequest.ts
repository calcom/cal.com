import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Validates cron job requests by checking for valid API key or secret.
 * Supports both Authorization header and apiKey query parameter.
 *
 */
export function validateRequest(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  return null;
}
