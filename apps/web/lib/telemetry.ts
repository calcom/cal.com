import { NextApiRequest, NextApiResponse } from "next";
import { EventSinkOpts } from "next-collect";
import { useCollector } from "next-collect/client";
// it's ok to do this since we're importing only types which are harmless
// eslint-disable-next-line  @next/next/no-server-import-in-page
import type { NextRequest, NextResponse } from "next/server";

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
  const host = document.location.host;
  const docPath = route ?? "";
  return {
    page_url: route,
    doc_encoding: document.characterSet,
    url: document.location.protocol + "//" + host + (docPath ?? ""),
    ...extraData,
  };
}

export const nextCollectBasicSettings: EventSinkOpts = {
  drivers: [
    process.env.TELEMETRY_KEY && {
      type: "jitsu",
      opts: {
        key: process.env.TELEMETRY_KEY,
        server: "https://t.calendso.com",
      },
    },
    process.env.TELEMETRY_DEBUG && { type: "echo", opts: { disableColor: true } },
  ],
  eventTypes: [
    { "*.ttf": null },
    { "*.webmanifest": null },
    { "*.json": null },
    { "*.svg": null },
    { "*.map": null },
    { "*.png": null },
    { "*.gif": null },
    { "/api/collect-events": null },
    { "/api*": null },
    { "/img*": null },
    { "/favicon*": null },
    { "/*": telemetryEventTypes.pageView },
  ],
};

export const extendEventData = (
  req: NextRequest | NextApiRequest,
  res: NextResponse | NextApiResponse,
  original: any
) => {
  const onVercel =
    typeof req.headers?.get === "function"
      ? !!req.headers.get("x-vercel-id")
      : !!(req.headers as any)?.["x-vercel-id"];
  const pageUrl = original?.page_url || (req as any)?.page?.name || undefined;
  return {
    title: "",
    ipAddress: "",
    queryString: "",
    page_url: pageUrl,
    licenseConsent: !!process.env.NEXT_PUBLIC_LICENSE_CONSENT,
    licensekey: process.env.CALCOM_LICENSE_KEY,
    isTeamBooking:
      original?.isTeamBooking === undefined
        ? pageUrl?.includes("team/") || undefined
        : original?.isTeamBooking,
    referrer: "",
    onVercel,
    isAuthorized:
      !!req.cookies["next-auth.session-token"] || !!req.cookies["__Secure-next-auth.session-token"],
    utc_time: new Date().toISOString(),
  };
};

export const useTelemetry = useCollector;
