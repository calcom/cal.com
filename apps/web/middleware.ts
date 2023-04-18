import { collectEvents } from "next-collect/server";
import { NextMiddleware, NextResponse, userAgent } from "next/server";

import { CONSOLE_URL, WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { isIpInBanlist } from "@calcom/lib/getIP";
import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

const middleware: NextMiddleware = async (req) => {
  const url = req.nextUrl;

  if (["/api/collect-events", "/api/auth"].some((p) => url.pathname.startsWith(p))) {
    const callbackUrl = url.searchParams.get("callbackUrl");
    const { isBot } = userAgent(req);

    if (
      isBot ||
      (callbackUrl && ![CONSOLE_URL, WEBAPP_URL, WEBSITE_URL].some((u) => callbackUrl.startsWith(u))) ||
      isIpInBanlist(req)
    ) {
      // DDOS Prevention: Immediately end request with no response - Avoids a redirect as well initiated by NextAuth on invalid callback
      req.nextUrl.pathname = "/api/nope";
      return NextResponse.redirect(req.nextUrl);
    }
  }

  // Ensure that embed query param is there in when /embed is added.
  // query param is the way in which client side code knows that it is in embed mode.
  if (url.pathname.endsWith("/embed") && typeof url.searchParams.get("embed") !== "string") {
    url.searchParams.set("embed", "");
    return NextResponse.redirect(url);
  }

  // Don't 404 old routing_forms links
  if (url.pathname.startsWith("/apps/routing_forms")) {
    url.pathname = url.pathname.replace("/apps/routing_forms", "/apps/routing-forms");
    return NextResponse.rewrite(url);
  }

  if (url.pathname.startsWith("/auth/login")) {
    const moreHeaders = new Headers();
    // Use this header to actually enforce CSP, otherwise it is running in Report Only mode on all pages.
    moreHeaders.set("x-csp-enforce", "true");
    return NextResponse.next({
      request: {
        headers: moreHeaders,
      },
    });
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/api/collect-events/:path*",
    "/api/auth/:path*",
    "/apps/routing_forms/:path*",
    "/:path*/embed",
    "/auth/login",
  ],
};

export default collectEvents({
  middleware,
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
