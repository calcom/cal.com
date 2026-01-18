import { get } from "@vercel/edge-config";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { HttpError } from "@calcom/lib/http-error";
import { piiHasher } from "@calcom/lib/server/PiiHasher";

import { getCspHeader, getCspNonce } from "@lib/csp";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeGet = async <T = any>(key: string): Promise<T | undefined> => {
  try {
    return get<T>(key);
  } catch {
    // Don't crash if EDGE_CONFIG env var is missing
  }
};

export const POST_METHODS_ALLOWED_API_ROUTES = [
  "/api/auth/forgot-password",
  "/api/auth/oauth/me",
  "/api/auth/oauth/refreshToken",
  "/api/auth/oauth/token",
  "/api/auth/reset-password",
  "/api/auth/saml/callback",
  "/api/auth/saml/token",
  "/api/auth/setup",
  "/api/auth/signup",
  "/api/auth/two-factor/totp/disable",
  "/api/auth/two-factor/totp/enable",
  "/api/auth/two-factor/totp/setup",
  "/api/auth/session",
  "/api/availability/calendar",
  "/api/cancel",
  "/api/cron/bookingReminder",
  "/api/cron/calendar-cache-cleanup",
  "/api/cron/changeTimeZone",
  "/api/cron/checkSmsPrices",
  "/api/cron/downgradeUsers",
  "/api/cron/monthlyDigestEmail",
  "/api/cron/syncAppMeta",
  "/api/cron/webhookTriggers",
  "/api/cron/workflows/scheduleEmailReminders",
  "/api/cron/workflows/scheduleSMSReminders",
  "/api/cron/workflows/scheduleWhatsappReminders",
  "/api/get-inbound-dynamic-variables",
  "/api/integrations/", // for /api/integrations/[...args] and webhooks
  "/api/recorded-daily-video",
  "/api/router",
  "/api/routing-forms/queued-response",
  "/api/scim/v2.0/", // /api/scim/v2.0/[...directory]
  "/api/support/conversation",
  "/api/sync/helpscout",
  "/api/twilio/webhook",
  "/api/username",
  "/api/verify-booking-token",
  "/api/video/guest-session",
  "/api/webhook/app-credential",
  "/api/webhooks/calendar-subscription/", // /api/webhooks/calendar-subscription/[provider]
  "/api/webhooks/retell-ai",
  "/api/workflows/sms/user-response",
  "/api/trpc/", // for tRPC
  "/api/auth/callback/", // for NextAuth
  "/api/book/event",
  "/api/book/instant-event",
  "/api/book/recurring-event",
  "/availability",
];

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

// Vercel/Edge rejects non‑ASCII header values (see: https://github.com/vercel/next.js/issues/85631)
const isAscii = (s: string) => {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0x7f) return false;
  return true;
};
const stripNonAscii = (s: string) => {
  let out = "";
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) <= 0x7f) out += s[i];
  return out;
};
const sanitizeRequestHeaders = (headers: Iterable<[string, string]>): Headers => {
  const out = new Headers();
  for (const [name, raw] of Array.from(headers)) {
    if (!isAscii(name)) continue;
    let value = raw;
    if (!isAscii(value)) {
      // Heuristic: if the string contains common mojibake markers (Ã: 0xC3, Â: 0xC2),
      // prefer a simple strip (avoids introducing spurious ASCII letters like 'A').
      let hasMojibakeMarker = false;
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code === 0xc3 || code === 0xc2) {
          hasMojibakeMarker = true;
          break;
        }
      }

      if (hasMojibakeMarker) {
        value = stripNonAscii(value);
      } else {
        try {
          value = stripNonAscii(value.normalize("NFKD"));
        } catch {
          value = stripNonAscii(value);
        }
      }
    }
    if (value) out.set(name, value);
  }
  return out;
};

const isPagePathRequest = (url: URL) => {
  const isNonPagePathPrefix = /^\/(?:_next|api)\//;
  const isFile = /\..*$/;
  const { pathname } = url;
  return !isNonPagePathPrefix.test(pathname) && !isFile.test(pathname);
};

const shouldEnforceCsp = (url: URL) => {
  return url.pathname.startsWith("/auth/login") || url.pathname.startsWith("/login");
};

const proxy = async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const requestorIp = getIP(req);
  try {
    await checkRateLimitAndThrowError({
      rateLimitingType: "common",
      identifier: piiHasher.hash(`${req.nextUrl.pathname}-${requestorIp}`),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return new NextResponse(error.message, { status: error.statusCode });
    }
    throw error;
  }

  // const postCheckResult = checkPostMethod(req);
  // if (postCheckResult) return postCheckResult;

  const url = req.nextUrl;
  const reqWithEnrichedHeaders = enrichRequestWithHeaders({ req });
  const requestHeaders = new Headers(reqWithEnrichedHeaders.headers);

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
      headers: sanitizeRequestHeaders(requestHeaders),
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
  matcher: ["/((?!_next(?:/|$)|static(?:/|$)|public(?:/|$)|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$).*)"],
};

export default proxy;
