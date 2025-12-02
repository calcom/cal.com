import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const BLOCKED_ROUTE_SEGMENTS = ["_get", "_post", "_patch", "_delete", "_auth-middleware"] as const;

const pathContainsBlockedSegment = (pathname: string) =>
  pathname
    .split("/")
    .filter(Boolean)
    .some((segment) => BLOCKED_ROUTE_SEGMENTS.includes(segment as (typeof BLOCKED_ROUTE_SEGMENTS)[number]));

export function middleware(request: NextRequest) {
  if (pathContainsBlockedSegment(request.nextUrl.pathname)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: BLOCKED_ROUTE_SEGMENTS.flatMap((segment) => [
    `/:path*/${segment}/:rest*`,
    `/:path*/${segment}`,
  ]),
};
