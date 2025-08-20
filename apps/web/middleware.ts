import { get } from "@vercel/edge-config";
import { collectEvents } from "next-collect/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

import { getCspHeader, getCspNonce } from "@lib/csp";

const safeGet = async <T = any>(key: string): Promise<T | undefined> => {
  try {
    return get<T>(key);
  } catch (error) {
    // Don't crash if EDGE_CONFIG env var is missing
  }
};

export const POST_METHODS_ALLOWED_API_ROUTES = ["/api/auth/signup"];
export function checkPostMethod(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!POST_METHODS_ALLOWED_API_ROUTES.some((route) => pathname.startsWith(route)) && req.method === "POST") {
    return new NextResponse(null, {
      status: 405,
      statusText: "Method Not Allowed",
      headers: {
        Allow: "GET",
      },
    });
  }
  return null;
}

export function checkStaticFiles(pathname: string) {
  const hasFileExtension = /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);
  // Skip Next.js internal paths (_next) and static assets
  if (pathname.startsWith("/_next") || hasFileExtension) {
    return NextResponse.next();
  }
}

const isPagePathRequest = (url: URL) => {
  const isNonPagePathPrefix = /^\/(?:_next|api)\//;
  const isFile = /\..*$/;
  const { pathname } = url;
  return !isNonPagePathPrefix.test(pathname) && !isFile.test(pathname);
};

const shouldEnforceCsp = (url: URL) => {
  return url.pathname.startsWith("/auth/login") || url.pathname.startsWith("/login");
};

const middleware = async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const postCheckResult = checkPostMethod(req);
  if (postCheckResult) return postCheckResult;

  const isStaticFile = checkStaticFiles(req.nextUrl.pathname);
  if (isStaticFile) return isStaticFile;

  const url = req.nextUrl;
  const reqWithEnrichedHeaders = enrichRequestWithHeaders({ req });
  const requestHeaders = new Headers(reqWithEnrichedHeaders.headers);

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
      reqWithEnrichedHeaders.nextUrl.pathname = `/maintenance`;
      return NextResponse.rewrite(reqWithEnrichedHeaders.nextUrl);
    }
  }

  const routingFormRewriteResponse = routingForms.handleRewrite(url);
  if (routingFormRewriteResponse) {
    return responseWithHeaders({ url, res: routingFormRewriteResponse, req: reqWithEnrichedHeaders });
  }

  if (url.pathname.startsWith("/api/auth/signup")) {
    const isSignupDisabled = await safeGet<boolean>("isSignupDisabled");
    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isSignupDisabled) {
      // TODO: Consider using responseWithHeaders here
      return NextResponse.json({ error: "Signup is disabled" }, { status: 503 });
    }
  }

  if (url.pathname.startsWith("/apps/installed")) {
    const returnTo = reqWithEnrichedHeaders.cookies.get("return-to");

    if (returnTo?.value) {
      const response = NextResponse.redirect(new URL(returnTo.value, reqWithEnrichedHeaders.url), {
        headers: requestHeaders,
      });
      response.cookies.delete("return-to");
      return response;
    }
  }

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (url.pathname.startsWith("/auth/logout")) {
    res.cookies.delete("next-auth.session-token");
  }

  return responseWithHeaders({ url, res, req: reqWithEnrichedHeaders });
};

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

    const embedColorScheme = url.searchParams.get("ui.color-scheme");
    if (embedColorScheme) {
      res.headers.set("x-embedColorScheme", embedColorScheme);
    }

    res.headers.set("x-isEmbed", "true");
    return res;
  },
};

const contentSecurityPolicy = {
  addResponseHeaders: ({ res, req }: { res: NextResponse; req: NextRequest }) => {
    const nonce = req.headers.get("x-csp-nonce");
    if (!nonce) {
      res.headers.set("x-csp-status", "not-opted-in");
      return res;
    }
    const cspHeader = getCspHeader({ shouldEnforceCsp: shouldEnforceCsp(req.nextUrl), nonce });
    if (cspHeader) {
      res.headers.set(cspHeader.name, cspHeader.value);
    }
    return res;
  },
  addRequestHeaders: ({ req }: { req: NextRequest }) => {
    if (!process.env.CSP_POLICY) {
      return req;
    }
    const isCspApplicable = isPagePathRequest(req.nextUrl);
    if (!isCspApplicable) {
      return req;
    }
    const nonce = getCspNonce();
    req.headers.set("x-csp-nonce", nonce);
    return req;
  },
};

function responseWithHeaders({ url, res, req }: { url: URL; res: NextResponse; req: NextRequest }) {
  const resWithCSP = contentSecurityPolicy.addResponseHeaders({ res, req });
  const resWithEmbeds = embeds.addResponseHeaders({ url, res: resWithCSP });
  return resWithEmbeds;
}

function enrichRequestWithHeaders({ req }: { req: NextRequest }) {
  const reqWithCSP = contentSecurityPolicy.addRequestHeaders({ req });
  return reqWithCSP;
}

export const config = {
  // Next.js Doesn't support spread operator in config matcher, so, we must list all paths explicitly here.
  // https://github.com/vercel/next.js/discussions/42458
  // WARNING: DO NOT ADD AN ENDING SLASH "/" TO THE PATHS BELOW
  // THIS WILL MAKE THEM NOT MATCH AND HENCE NOT HIT MIDDLEWARE
  matcher: [
    // Routes to enforce CSP
    "/auth/login",
    "/login",
    // Routes to set cookies
    "/apps/installed",
    "/auth/logout",
    // Embed Routes,
    "/:path*/embed",
    // API routes
    "/api/auth/signup",
  ],
};

export default collectEvents({
  middleware,
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
