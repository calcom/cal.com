import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Simplified search API to avoid fumadocs-core compatibility issues
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const _query = searchParams.get("q");

  // Return empty results for now to avoid build errors
  return NextResponse.json({
    results: [],
  });
}
