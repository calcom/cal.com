import { getBucket } from "abTest/utils";
import type { NextMiddleware, NextRequest } from "next/server";
import { NextResponse, URLPattern } from "next/server";

import { FUTURE_ROUTES_ENABLED_COOKIE_NAME, FUTURE_ROUTES_OVERRIDE_COOKIE_NAME } from "@calcom/lib/constants";

const ROUTES: [URLPattern, boolean][] = [
  ["/apps/:slug/setup", process.env.APP_ROUTER_APPS_SLUG_SETUP_ENABLED === "1"] as const,
  ["/auth/forgot-password/:path*", process.env.APP_ROUTER_AUTH_FORGOT_PASSWORD_ENABLED === "1"] as const,
  ["/auth/login", process.env.APP_ROUTER_AUTH_LOGIN_ENABLED === "1"] as const,
  ["/auth/logout", process.env.APP_ROUTER_AUTH_LOGOUT_ENABLED === "1"] as const,
  ["/auth/saml-idp", process.env.APP_ROUTER_AUTH_SAML_ENABLED === "1"] as const,
  ["/auth/platform/:path*", process.env.APP_ROUTER_AUTH_PLATFORM_ENABLED === "1"] as const,
  ["/auth/oauth2/:path*", process.env.APP_ROUTER_AUTH_OAUTH2_ENABLED === "1"] as const,
  ["/team", process.env.APP_ROUTER_TEAM_ENABLED === "1"] as const,
].map(([pathname, enabled]) => [
  new URLPattern({
    pathname,
  }),
  enabled,
]);

export const abTestMiddlewareFactory =
  (next: (req: NextRequest) => Promise<NextResponse<unknown>>): NextMiddleware =>
  async (req: NextRequest) => {
    const response = await next(req);

    const { pathname } = req.nextUrl;

    const override = req.cookies.has(FUTURE_ROUTES_OVERRIDE_COOKIE_NAME);

    const route = ROUTES.find(([regExp]) => regExp.test(req.url)) ?? null;
    const enabled = route !== null ? route[1] || override : false;

    if (pathname.includes("future") || !enabled) {
      return response;
    }

    const bucketValue = override ? "future" : req.cookies.get(FUTURE_ROUTES_ENABLED_COOKIE_NAME)?.value;

    if (!bucketValue || !["future", "legacy"].includes(bucketValue)) {
      // cookie does not exist or it has incorrect value
      const bucket = getBucket();

      response.cookies.set(FUTURE_ROUTES_ENABLED_COOKIE_NAME, bucket, {
        expires: Date.now() + 1000 * 60 * 30,
        httpOnly: true,
      }); // 30 min in ms

      if (bucket === "legacy") {
        return response;
      }

      const url = req.nextUrl.clone();
      url.pathname = `future${pathname}/`;

      return NextResponse.rewrite(url, response);
    }

    if (bucketValue === "legacy") {
      return response;
    }

    const url = req.nextUrl.clone();
    url.pathname = `future${pathname}/`;

    return NextResponse.rewrite(url, response);
  };
