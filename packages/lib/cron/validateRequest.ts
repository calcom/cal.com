import process from "node:process";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Validates cron job requests by checking for valid API key.
 * Supports both Authorization header and apiKey query parameter.
 *
 */
export function validateRequest(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (!apiKey) {
    return NextResponse.json({ message: "No apiKey provided" }, { status: 401 });
  }

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  return null;
}
