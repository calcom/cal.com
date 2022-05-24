import { NextApiRequest } from "next";
import { EventSinkOpts } from "next-collect";

export const collectEventTypes = {
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

export const nextCollectBasicSettings: EventSinkOpts = {
  drivers: [
    {
      type: "jitsu",
      opts: {
        key: process.env.NEXT_PUBLIC_TELEMETRY_KEY,
        host: "http://localhost:8001",
        log_level: "ERROR",
        cookie_name: "__clnds",
        capture_3rd_party_cookies: false,
      },
    },
  ],
  eventTypes: [
    { "/api/collect-api": null },
    { "/api*": collectEventTypes.apiCall },
    { "/img*": null },
    { "/favicon*": null },
    { "/*": collectEventTypes.pageView },
  ],
};

export const extendEventData = (req: NextApiRequest) => {
  const route = req.url;
  const host = req.headers.host ?? "";
  const docPath = route ?? "";
  return {
    page_url: docPath,
    page_title: "",
    source_ip: "",
    url: document.location.protocol + "//" + host + docPath,
    doc_host: "localhost" === host || "127.0.0.1" === host ? "localhost" : "masked",
    doc_search: "",
    doc_path: docPath,
    referer: "",
  };
};
