import { get } from "@vercel/edge-config";
import { collectEvents } from "next-collect/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

import { detectBot } from "./lib/botDetection";
import { csp } from "./lib/csp";

const safeGet = async <T = any>(key: string): Promise<T | undefined> => {
  try {
    return get<T>(key);
  } catch (error) {
    // Don't crash if EDGE_CONFIG env var is missing
  }
};

// SUPER IMPORTANT: If adding dynamic routes, make sure to update
// the detection logic for `isNonBookingRoute` in `isBookingPageRoute` function below
const MATCHED_ROUTES = {
  nonBooking: [
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
    "/api/trpc/:path*",
  ],
  booking: ["/:user/:type", "/team/:slug/:type"],
} as const;

export const POST_METHODS_ALLOWED_API_ROUTES = ["/api/auth/signup", "/api/trpc/"];
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

function isBookingPageRoute(pathname: string): boolean {
  // Since middleware only runs on routes defined in config.matcher,
  // we can determine booking pages by excluding known non-booking routes

  // Extract static routes from our centralized config (excluding dynamic patterns)
  const staticRoutes = MATCHED_ROUTES.nonBooking.filter((route) => !route.includes(":"));

  const isNonBookingRoute =
    staticRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/api/trpc/") ||
    pathname.endsWith("/embed");

  // If it's not a non-booking route and matches our middleware, it's a booking page
  return !isNonBookingRoute;
}

function checkBotDetection(req: NextRequest): NextResponse | null {
  const url = req.nextUrl;

  if (isBookingPageRoute(url.pathname)) {
    const { isBot } = detectBot(req.headers);
    if (isBot) {
      url.pathname = `${url.pathname}/preview`;
      return NextResponse.rewrite(url);
    }
  }

  return null;
}

const middleware = async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const postCheckResult = checkPostMethod(req);
  if (postCheckResult) return postCheckResult;

  const isStaticFile = checkStaticFiles(req.nextUrl.pathname);
  if (isStaticFile) return isStaticFile;

  const url = req.nextUrl;
  const requestHeaders = new Headers(req.headers);

  const botDetectionResult = checkBotDetection(req);
  if (botDetectionResult) return botDetectionResult;

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

  if (url.pathname.startsWith("/apps/installed")) {
    const returnTo = req.cookies.get("return-to");

    if (returnTo?.value) {
      const response = NextResponse.redirect(new URL(returnTo.value, req.url), { headers: requestHeaders });
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

  return responseWithHeaders({ url, res, req });
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
  // WARNING: DO NOT ADD AN ENDING SLASH "/" TO THE PATHS BELOW
  // THIS WILL MAKE THEM NOT MATCH AND HENCE NOT HIT MIDDLEWARE

  // SUPER IMPORTANT: Keep this list in sync with MATCHED_ROUTES object above!
  matcher: [
    // Non-booking routes (must match MATCHED_ROUTES.nonBooking)
    "/auth/login",
    "/login",
    "/apps/installed",
    "/auth/logout",
    "/api/auth/signup",
    "/api/trpc/:path*",
    "/:path*/embed",
    // Booking routes (must match MATCHED_ROUTES.booking)
    "/:user/:type",
    "/team/:slug/:type",
  ],
};

export default collectEvents({
  middleware,
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
