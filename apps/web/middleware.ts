import { collectEvents } from "next-collect/server";
// eslint-disable-next-line @next/next/no-server-import-in-page
import { NextMiddleware, NextResponse, userAgent } from "next/server";

import { CONSOLE_URL, WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

const V2_WHITELIST = ["/settings/admin"];

const middleware: NextMiddleware = async (req) => {
  const url = req.nextUrl;

  if (url.pathname.startsWith("/api/auth")) {
    const callbackUrl = url.searchParams.get("callbackUrl");
    const { isBot } = userAgent(req);

    if (
      isBot ||
      (callbackUrl && ![CONSOLE_URL, WEBAPP_URL, WEBSITE_URL].some((u) => callbackUrl.startsWith(u)))
    ) {
      // DDOS Prevention: Immediately end request with no response - Avoids a redirect as well initiated by NextAuth on invalid callback
      req.nextUrl.pathname = "/api/nope";
      return NextResponse.redirect(req.nextUrl);
    }
  }
  /** Display available V2 pages to users who opted-in to early access */
  if (req.cookies.has("calcom-v2-early-access") && V2_WHITELIST.some((p) => url.pathname.startsWith(p))) {
    // rewrite to the current subdomain under the pages/sites folder
    url.pathname = `/v2${url.pathname}`;
  }

  return NextResponse.rewrite(url);
};

export default collectEvents({
  middleware,
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
