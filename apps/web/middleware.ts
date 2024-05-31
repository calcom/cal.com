import { get } from "@vercel/edge-config";
import { collectEvents } from "next-collect/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

import { csp } from "@lib/csp";

import { abTestMiddlewareFactory } from "./abTest/middlewareFactory";

const safeGet = async <T = any>(key: string): Promise<T | undefined> => {
  try {
    return get<T>(key);
  } catch (error) {
    // Don't crash if EDGE_CONFIG env var is missing
  }
};

const middleware = async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const url = req.nextUrl;
  const requestHeaders = new Headers(req.headers);

  requestHeaders.set("x-url", req.url);

  if (!url.pathname.startsWith("/api")) {
    //
    // NOTE: When tRPC hits an error a 500 is returned, when this is received
    //       by the application the user is automatically redirected to /auth/login.
    //
    //     - For this reason our matchers are sufficient for an app-wide maintenance page.
    //
    // Check whether the maintenance page should be shown
    const isInMaintenanceMode = await safeGet<boolean>("isInMaintenanceMode");
    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isInMaintenanceMode) {
      req.nextUrl.pathname = `/maintenance`;
      return NextResponse.rewrite(req.nextUrl);
    }
  }

  const res = routingForms.handle(url);

  const { nonce } = csp(req, res ?? null);

  if (!process.env.CSP_POLICY) {
    req.headers.set("x-csp", "not-opted-in");
  } else if (!req.headers.get("x-csp")) {
    // If x-csp not set by gSSP, then it's initialPropsOnly
    req.headers.set("x-csp", "initialPropsOnly");
  } else {
    req.headers.set("x-csp", nonce ?? "");
  }

  if (res) {
    return res;
  }

  if (url.pathname.startsWith("/api/trpc/")) {
    requestHeaders.set("x-cal-timezone", req.headers.get("x-vercel-ip-timezone") ?? "");
  }

  if (url.pathname.startsWith("/api/auth/signup")) {
    const isSignupDisabled = await safeGet<boolean>("isSignupDisabled");
    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isSignupDisabled) {
      return NextResponse.json({ error: "Signup is disabled" }, { status: 503 });
    }
  }

  if (url.pathname.startsWith("/auth/login") || url.pathname.startsWith("/login")) {
    // Use this header to actually enforce CSP, otherwise it is running in Report Only mode on all pages.
    requestHeaders.set("x-csp-enforce", "true");
  }

  if (url.pathname.startsWith("/future/apps/installed")) {
    const returnTo = req.cookies.get("return-to")?.value;
    if (returnTo !== undefined) {
      requestHeaders.set("Set-Cookie", "return-to=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT");

      let validPathname = returnTo;

      try {
        validPathname = new URL(returnTo).pathname;
      } catch (e) {}

      const nextUrl = url.clone();
      nextUrl.pathname = validPathname;
      return NextResponse.redirect(nextUrl, { headers: requestHeaders });
    }
  }

  if (url.pathname.startsWith("/future/auth/logout")) {
    cookies().delete("next-auth.session-token");
  }

  requestHeaders.set("x-pathname", url.pathname);

  const locale = await getLocale(req);

  requestHeaders.set("x-locale", locale);

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
  matcher: [
    "/:path*/embed",
    "/api/auth/signup",
    "/api/trpc/:path*",
    "/login",
    "/auth/login",
    "/future/auth/login",
    /**
     * Paths required by routingForms.handle
     */
    "/apps/routing_forms/:path*",

    "/event-types",
    "/future/event-types/",
    "/settings/admin/:path*",
    "/future/settings/admin/:path*",
    "/apps/installed/:category/",
    "/future/apps/installed/:category/",
    "/apps/:slug/",
    "/future/apps/:slug/",
    "/apps/:slug/setup/",
    "/future/apps/:slug/setup/",
    "/apps/categories/",
    "/future/apps/categories/",
    "/apps/categories/:category/",
    "/future/apps/categories/:category/",
    "/workflows/:path*",
    "/future/workflows/:path*",
    "/settings/teams/:path*",
    "/future/settings/teams/:path*",
    "/getting-started/:step/",
    "/future/getting-started/:step/",
    "/apps",
    "/future/apps",
    "/bookings/:status/",
    "/future/bookings/:status/",
    "/video/:path*",
    "/future/video/:path*",
    "/teams",
    "/future/teams/",
  ],
};

export default collectEvents({
  middleware: abTestMiddlewareFactory(middleware),
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
