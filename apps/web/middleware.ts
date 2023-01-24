import { collectEvents } from "next-collect/server";
import { NextMiddleware, NextResponse, userAgent } from "next/server";

import { CONSOLE_URL, WEBAPP_URL, WEBSITE_URL, IS_SELF_HOSTED } from "@calcom/lib/constants";
import { isIpInBanlist } from "@calcom/lib/getIP";
import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

const middleware: NextMiddleware = async (req) => {
  const url = req.nextUrl;

  //TODO: Might be a good idea to extract out all conditions where IS_SELF_HOSTED is handled in a Cal.config.ts file, so that self hosters can also enable this features just by modifying that config
  if (url.pathname.startsWith("/auth/login") && !IS_SELF_HOSTED) {
    console.log("Redirecting to login page");
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    return response;
  }

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
