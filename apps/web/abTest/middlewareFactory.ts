import { getBucket } from "abTest/utils";
import type { NextMiddleware, NextRequest } from "next/server";
import { NextResponse, URLPattern } from "next/server";
import z from "zod";

const ROUTES: [URLPattern, boolean][] = [
  ["/event-types", process.env.APP_ROUTER_EVENT_TYPES_ENABLED === "1"] as const,
  ["/settings/admin/:path*", process.env.APP_ROUTER_SETTINGS_ADMIN_ENABLED === "1"] as const,
  ["/apps/installed/:category", process.env.APP_ROUTER_APPS_INSTALLED_CATEGORY_ENABLED === "1"] as const,
  ["/apps/:slug", process.env.APP_ROUTER_APPS_SLUG_ENABLED === "1"] as const,
  ["/apps/:slug/setup", process.env.APP_ROUTER_APPS_SLUG_SETUP_ENABLED === "1"] as const,
  ["/apps/categories", process.env.APP_ROUTER_APPS_CATEGORIES_ENABLED === "1"] as const,
  ["/apps/categories/:category", process.env.APP_ROUTER_APPS_CATEGORIES_CATEGORY_ENABLED === "1"] as const,
].map(([pathname, enabled]) => [
  new URLPattern({
    pathname,
  }),
  enabled,
]);

const FUTURE_ROUTES_OVERRIDE_COOKIE_NAME = "x-calcom-future-routes-override";
const FUTURE_ROUTES_ENABLED_COOKIE_NAME = "x-calcom-future-routes-enabled";

const bucketSchema = z.union([z.literal("legacy"), z.literal("future")]);

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

    const safeParsedBucket = override
      ? { success: true as const, data: "future" as const }
      : bucketSchema.safeParse(req.cookies.get(FUTURE_ROUTES_ENABLED_COOKIE_NAME)?.value);

    if (!safeParsedBucket.success) {
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

    if (safeParsedBucket.data === "legacy") {
      return response;
    }

    const url = req.nextUrl.clone();
    url.pathname = `future${pathname}/`;

    return NextResponse.rewrite(url, response);
  };
