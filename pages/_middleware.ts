/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NextRequest, NextResponse } from "next/server";

// FIXME - this would be nicer if it was dynamic using `fs.readDirSync('.')
const SKIP_PATHS = [
  ".next",
  "404",
  "api",
  "auth",
  "fonts",
  "availability",
  "bookings",
  "call",
  "cancel",
  "event-types",
  "getting-started",
  "index",
  "integrations",
  "payment",
  "reschedule",
  "sandbox",
  "settings",
  "success",
  "team",
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (!pathname) {
    return;
  }
  const parts = pathname.split("/").filter(Boolean);
  const [firstPart] = parts;

  const isFileRequest = pathname.includes(".");

  if (SKIP_PATHS.includes(firstPart) || isFileRequest || pathname === "/") {
    return;
  }

  const localeWithCountry = req.headers.get("accept-language")?.split(",")?.[0] || "en-US";

  const locale = localeWithCountry.split("-")[0];

  const newPathname = `/${locale}${pathname}`;

  console.log("redirect", { pathname, newPathname });

  req.nextUrl.pathname = newPathname;

  return NextResponse.rewrite(req.nextUrl);
}
