import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_request: NextRequest) {
  // Matcher guarantees the last segment is one of the blocked segments, so we can
  // immediately return a 403 without further path checks.
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

export const config = {
  // The blocked segment is always the last part of the path, so we only need this matcher.
  matcher: [
    "/:path*/_get",
    "/:path*/_post",
    "/:path*/_patch",
    "/:path*/_delete",
    "/:path*/_auth-middleware",
  ],
};
