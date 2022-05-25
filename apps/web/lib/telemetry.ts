import { NextApiRequest } from "next";
import { EventSinkOpts, PageEvent } from "next-collect";
import { useCollector } from "next-collect/client";

export const telemetryEventTypes = {
  pageView: "page_view",
  apiCall: "api_call",
  bookingConfirmed: "booking_confirmed",
  bookingCancelled: "booking_cancelled",
  importSubmitted: "import_submitted",
  googleLogin: "google_login",
  login: "login",
  samlLogin: "saml_login",
  samlConfig: "saml_config",
  embedView: "embed_view",
  embedBookingConfirmed: "embed_booking_confirmed",
};

export function collectPageParameters(
  route?: string,
  extraData: Record<string, unknown> = {}
): Record<string, unknown> {
  const host = document.location.hostname;
  const docPath = route ?? "";
  return {
    page_url: route,
    url: document.location.protocol + "//" + host + (docPath ?? ""),
    ...extraData,
  };
}

export const nextCollectBasicSettings: EventSinkOpts = {
  drivers: [
    {
      type: "jitsu",
      opts: {
        key: process.env.TELEMETRY_S2S_KEY,
        server: "https://t.calendso.com",
      },
    },
  ],
  cookieName: "__clnds",
  eventTypes: [
    { "*.ttf": null },
    { "*.sitemanifest": null },
    { "*.json": null },
    { "*.svg": null },
    { "/api/collect-events": null },
    { "/api*": null },
    { "/img*": null },
    { "/favicon*": null },
    { "/*": telemetryEventTypes.pageView },
  ],
};

export const extendEventData = (req: NextApiRequest) => {
  const pageOverwrite: Partial<PageEvent> & any = {
    title: "",
    ipAddress: "",
    queryString: "",
    referrer: "",
    onVercel: !!req.headers["x-vercel-id"],
    isAuthorized: !!req.cookies["next-auth.session-token"],
    utc_time: new Date().toISOString(),
  };
  return pageOverwrite;
};

export const useTelemetry = useCollector;
