import { match } from "@formatjs/intl-localematcher";
import { get } from "@vercel/edge-config";
import Negotiator from "negotiator";
import { collectEvents } from "next-collect/server";
import type { NextMiddleware } from "next/server";
import { NextResponse } from "next/server";

import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

import { i18n } from "../../packages/config/next-i18next.config.js";

const APP_DIR_PATHS = ["/maintenance"];

function getLocale(inputHeaders: Headers) {
  const headers: Record<string, string> = {};
  inputHeaders.forEach((value, key) => (headers[key] = value));

  const languages = new Negotiator({ headers }).languages();
  return match(languages, i18n.locales, i18n.defaultLocale);
}

function isAppDirPath(path: string) {
  return APP_DIR_PATHS.some((appDirPath) => path.startsWith(appDirPath));
}

function isMissingLocale(path: string) {
  return !i18n.locales.some((locale) => path.includes(`/${locale}/`));
}

const middleware: NextMiddleware = async (req) => {
  const url = req.nextUrl;
  const requestHeaders = new Headers(req.headers);

  // handle API related - /api is locale independent
  if (url.pathname.startsWith("/api")) {
    if (url.pathname.startsWith("/api/trpc/")) {
      requestHeaders.set("x-cal-timezone", req.headers.get("x-vercel-ip-timezone") ?? "");
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  // is appDirPath, but missing locale..
  if (isAppDirPath(url.pathname) && isMissingLocale(url.href)) {
    const locale = getLocale(requestHeaders);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${url.pathname}`;
    console.log("REWRITTEN");
    return NextResponse.rewrite(url);
  }

  //
  // NOTE: When tRPC hits an error a 500 is returned, when this is received
  //       by the application the user is automatically redirected to /auth/login.
  //
  //     - For this reason our matchers are sufficient for an app-wide maintenance page.
  //
  try {
    // Check whether the maintenance page should be shown
    const isInMaintenanceMode = await get<boolean>("isInMaintenanceMode");
    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isInMaintenanceMode) {
      req.nextUrl.pathname = `/maintenance`;
      return NextResponse.rewrite(req.nextUrl);
    }
  } catch (error) {
    // show the default page if EDGE_CONFIG env var is missing,
    // but log the error to the console
    // console.error(error);
  }

  const res = routingForms.handle(url);
  if (res) {
    return res;
  }
  // match regardless of lang
  if (url.pathname.includes("/auth/login")) {
    // Use this header to actually enforce CSP, otherwise it is running in Report Only mode on all pages.
    requestHeaders.set("x-csp-enforce", "true");
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
};

const routingForms = {
  handle: (url: URL) => {
    // Don't 404 old routing_forms links
    if (url.pathname.startsWith("/apps/routing_forms")) {
      url.pathname = url.pathname.replace(/^\/apps\/routing_forms($|\/)/, "/apps/routing-forms/");
      return NextResponse.rewrite(url);
    }
  },
};

export const config = {
  // Next.js Doesn't support spread operator in config matcher, so, we must list all paths explicitly here.
  // https://github.com/vercel/next.js/discussions/42458
  matcher: ["/((?!_next).*)"],
};

export default collectEvents({
  middleware,
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
