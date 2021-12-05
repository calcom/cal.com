/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(req: NextRequest) {
  const localeWithCountry = req.headers.get("accept-language")?.split(",")?.[0] || "en-US";

  const locale = localeWithCountry.split("-")[0];

  const shouldHandleLocale =
    !PUBLIC_FILE.test(req.nextUrl.pathname) &&
    !req.nextUrl.pathname.includes("/api/") &&
    req.nextUrl.locale === "default";

  if (shouldHandleLocale) {
    req.nextUrl.locale = locale;
    return NextResponse.rewrite(req.nextUrl);
  }
}
