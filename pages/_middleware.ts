/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { NextRequest, NextResponse } from "next/server";

import { i18n } from "../next-i18next.config";

const REDIRECTED_PAGES = ["/[locale]", "/[locale]/[user]"];

export async function middleware(req: NextRequest) {
  const pageName = req.page.name;
  const pathname = req.nextUrl.pathname;

  if (!pathname || !pageName) {
    return;
  }
  const parts = pathname.split("/").filter(Boolean);
  const [firstPart] = parts;

  const isFileRequest = pathname.includes(".");

  if (!REDIRECTED_PAGES.includes(pageName) || isFileRequest || i18n.locales.includes(firstPart)) {
    return;
  }

  const localeWithCountry = req.headers.get("accept-language")?.split(",")?.[0] || "en-US";

  const locale = localeWithCountry.split("-")[0];

  const newPathname = `/${locale}${pathname}`;

  console.log("redirect", { pathname, newPathname });

  req.nextUrl.pathname = newPathname;

  return NextResponse.rewrite(req.nextUrl);
}
