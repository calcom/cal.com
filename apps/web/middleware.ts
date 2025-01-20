import { CsrfError, createCsrfProtect } from "@edge-csrf/nextjs";
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

const csrfProtect = createCsrfProtect({
  cookie: {
    secure: process.env.NODE_ENV === "production",
  },
});

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

  const routingFormRewriteResponse = routingForms.handleRewrite(url);
  if (routingFormRewriteResponse) {
    return responseWithHeaders({ url, res: routingFormRewriteResponse, req });
  }

  if (url.pathname.startsWith("/api/trpc/")) {
    requestHeaders.set("x-cal-timezone", req.headers.get("x-vercel-ip-timezone") ?? "");
  }

  if (url.pathname.startsWith("/api/auth/signup")) {
    const isSignupDisabled = await safeGet<boolean>("isSignupDisabled");
    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isSignupDisabled) {
      // TODO: Consider using responseWithHeaders here
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
      // TODO: Consider using responseWithHeaders here
      return NextResponse.redirect(nextUrl, { headers: requestHeaders });
    }
  }

  if (url.pathname.startsWith("/future/auth/logout")) {
    cookies().set("next-auth.session-token", "", {
      path: "/",
      expires: new Date(0),
    });
  }

  requestHeaders.set("x-pathname", url.pathname);

  const locale = await getLocale(req);

  requestHeaders.set("x-locale", locale);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  await handleCsrfProtect(req, res);

  return responseWithHeaders({ url, res, req });
};

async function handleCsrfProtect(req: NextRequest, res: NextResponse) {
  const url = req.nextUrl;
  // Skip CSRF protection for trpc requests for now. Prevents E2E tests from failing.
  // Most trcp endpoints are authenticated.
  if (url.pathname.startsWith("/api/trpc/")) return;
  try {
    // So we don't have to attach the token to each POST request (for now)
    // const csrfTokenFromCookie = req.cookies.get("x-csrf-token")?.value;
    // const csrfTokenFromHeader = req.headers.get("x-csrf-token");
    // if (csrfTokenFromCookie && !csrfTokenFromHeader) req.headers.set("x-csrf-token", csrfTokenFromCookie);
    await csrfProtect(req, res);
  } catch (err) {
    if (err instanceof CsrfError) return new NextResponse("invalid csrf token", { status: 403 });
    throw err;
  }
}

const routingForms = {
  handleRewrite: (url: URL) => {
    // Don't 404 old routing_forms links
    if (url.pathname.startsWith("/apps/routing_forms")) {
      url.pathname = url.pathname.replace(/^\/apps\/routing_forms($|\/)/, "/apps/routing-forms/");
      return NextResponse.rewrite(url);
    }
  },
};

const embeds = {
  addResponseHeaders: ({ url, res }: { url: URL; res: NextResponse }) => {
    if (!url.pathname.endsWith("/embed")) {
      return res;
    }
    const isCOEPEnabled = url.searchParams.get("flag.coep") === "true";
    if (isCOEPEnabled) {
      res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    }
    return res;
  },
};

const contentSecurityPolicy = {
  addResponseHeaders: ({ res, req }: { res: NextResponse; req: NextRequest }) => {
    const { nonce } = csp(req, res ?? null);

    if (!process.env.CSP_POLICY) {
      res.headers.set("x-csp", "not-opted-in");
    } else if (!res.headers.get("x-csp")) {
      // If x-csp not set by gSSP, then it's initialPropsOnly
      res.headers.set("x-csp", "initialPropsOnly");
    } else {
      res.headers.set("x-csp", nonce ?? "");
    }
    return res;
  },
};

function responseWithHeaders({ url, res, req }: { url: URL; res: NextResponse; req: NextRequest }) {
  const resWithCSP = contentSecurityPolicy.addResponseHeaders({ res, req });
  const resWithEmbeds = embeds.addResponseHeaders({ url, res: resWithCSP });
  return resWithEmbeds;
}

export const config = {
  // Next.js Doesn't support spread operator in config matcher, so, we must list all paths explicitly here.
  // https://github.com/vercel/next.js/discussions/42458
  matcher: [
    "/403",
    "/500",
    "/icons",
    "/d/:path*",
    "/more/:path*",
    "/maintenance/:path*",
    "/enterprise/:path*",
    "/upgrade/:path*",
    "/connect-and-join/:path*",
    "/insights/:path*",
    "/:path*/embed",
    "/api/book/:path*",
    "/api/auth/signup",
    "/api/trpc/:path*",
    "/login",
    "/auth/login",
    "/auth/error",
    /**
     * Paths required by routingForms.handle
     */
    "/apps/routing_forms/:path*",

    "/event-types/:path*",
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
    "/getting-started/:path*",
    "/apps",
    "/bookings/:path*",
    "/video/:path*",
    "/teams/:path*",
    "/signup/:path*",
    "/settings/:path*",
    "/reschedule/:path*",
    "/availability/:path*",
    "/booking/:path*",
    "/routing-forms/:path*",
    "/team/:path*",
    "/org/[orgSlug]/[user]/[type]",
    "/org/[orgSlug]/team/[slug]/[type]",
    "/org/[orgSlug]/team/[slug]",
    "/org/[orgSlug]",
    // In order to protect all public pages from CSRF
    "/:user*",
  ],
};

export default collectEvents({
  middleware: abTestMiddlewareFactory(middleware),
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
