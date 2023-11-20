import { getBucket } from "abTest/utils";
import type { NextMiddleware, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";

const ROUTES: [RegExp, boolean][] = [
  [/^\/event-types$/, Boolean(process.env.APP_ROUTER_EVENT_TYPES_ENABLED)],
];

const FUTURE_ROUTES_OVERRIDE_COOKIE_NAME = "x-calcom-future-routes-override";
const FUTURE_ROUTES_ENABLED_COOKIE_NAME = "x-calcom-future-routes-enabled";

const bucketSchema = z.union([z.literal("legacy"), z.literal("future")]).default("legacy");

export const abTestMiddlewareFactory =
  (next: (req: NextRequest) => Promise<NextResponse<unknown>>): NextMiddleware =>
  async (req: NextRequest) => {
    const response = await next(req);

    const { pathname } = req.nextUrl;

    const override = req.cookies.has(FUTURE_ROUTES_OVERRIDE_COOKIE_NAME);

    const route = ROUTES.find(([regExp]) => regExp.test(pathname)) ?? null;

    const enabled = route !== null ? route[1] || override : false;

    if (pathname.includes("future") || !enabled) {
      return response;
    }

    const safeParsedBucket = override
      ? { success: true as const, data: "future" as const }
      : bucketSchema.safeParse(req.cookies.get(FUTURE_ROUTES_ENABLED_COOKIE_NAME)?.value);

    if (!safeParsedBucket.success) {
      // cookie does not exist or it has incorrect value

      const res = NextResponse.next(response);
      res.cookies.set(FUTURE_ROUTES_ENABLED_COOKIE_NAME, getBucket(), { expires: 1000 * 60 * 30 }); // 30 min in ms
      return res;
    }

    const bucketUrlPrefix = safeParsedBucket.data === "future" ? "future" : "";

    const url = req.nextUrl.clone();
    url.pathname = `${bucketUrlPrefix}${pathname}/`;

    return NextResponse.rewrite(url, response);
  };
