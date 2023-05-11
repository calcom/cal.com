/**
 * @typedef {import("next").NextApiRequest} NextApiRequest
 * @typedef {import("next").NextApiResponse} NextApiResponse
 * @typedef {import("next-collect").CollectOpts} CollectOpts
 * @typedef {import("next-collect").EventHandler} EventHandler
 * @typedef {import("next/server").NextRequest} NextRequest
 * @typedef {import("next/server").NextResponse} NextResponse
 */
const useCollector = require("next-collect/client");

const CONSOLE_URL = require("./constants");

/**
 * @type {{
 *   pageView: string;
 *   apiCall: string;
 *   bookingConfirmed: string;
 *   bookingCancelled: string;
 *   importSubmitted: string;
 *   login: string;
 *   embedView: string;
 *   embedBookingConfirmed: string;
 *   onboardingFinished: string;
 *   onboardingStarted: string;
 *   signup: string;
 *   team_created: string;
 *   website: {
 *     pageView: string;
 *   };
 *   slugReplacementAction: string;
 * }}
 */
const telemetryEventTypes = {
  pageView: "page_view",
  apiCall: "api_call",
  bookingConfirmed: "booking_confirmed",
  bookingCancelled: "booking_cancelled",
  importSubmitted: "import_submitted",
  login: "login",
  embedView: "embed_view",
  embedBookingConfirmed: "embed_booking_confirmed",
  onboardingFinished: "onboarding_finished",
  onboardingStarted: "onboarding_started",
  signup: "signup",
  team_created: "team_created",
  website: {
    pageView: "website_page_view",
  },
  slugReplacementAction: "slug_replacement_action",
};

/**
 * @param {string} [route]
 * @param {Record<string, unknown>} [extraData]
 * @returns {Record<string, unknown>}
 */
function collectPageParameters(route, extraData = {}) {
  const host = document.location.host;
  const docPath = route ?? "";
  return {
    page_url: route,
    doc_encoding: document.characterSet,
    url: document.location.protocol + "//" + host + (docPath ?? ""),
    ...extraData,
  };
}

/**
 * @type {EventHandler}
 */
const reportUsage = async (event, { fetch }) => {
  const ets = telemetryEventTypes;
  if ([ets.bookingConfirmed, ets.embedBookingConfirmed].includes(event.eventType)) {
    const key = process.env.CALCOM_LICENSE_KEY;
    const url = `${CONSOLE_URL}/api/deployments/usage?key=${key}&quantity=1`;
    try {
      return fetch(url, { method: "POST", mode: "cors" });
    } catch (e) {
      console.error(`Error reporting booking for key: '${key}'`, e);
      return Promise.resolve();
    }
  } else {
    return Promise.resolve();
  }
};

/**
 * @type {CollectOpts}
 */
const nextCollectBasicSettings = {
  drivers: [
    process.env.CALCOM_LICENSE_KEY && process.env.NEXT_PUBLIC_IS_E2E !== "1" ? reportUsage : undefined,
    process.env.CALCOM_TELEMETRY_DISABLED === "1" || process.env.NEXT_PUBLIC_IS_E2E === "1"
      ? undefined
      : {
          type: "jitsu",
          opts: {
            key: "s2s.2pvs2bbpqq1zxna97wcml.esb6cikfrf7yn0qoh1nj1",
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

/**
 * @param {NextRequest | NextApiRequest} req
 * @param {NextResponse | NextApiResponse} res
 * @param {any} original
 * @returns {Record<string, unknown>}
 */
const extendEventData = (req, res, original) => {
  const onVercel =
    typeof req.headers?.get === "function"
      ? !!req.headers.get("x-vercel-id")
      : !!req.headers?.["x-vercel-id"];
  const pageUrl = original?.page_url || req.url || undefined;
  const cookies = req.cookies;
  return {
    title: "",
    ipAddress: "",
    queryString: "",
    page_url: pageUrl,
    licensekey: process.env.CALCOM_LICENSE_KEY,
    isTeamBooking:
      original?.isTeamBooking === undefined
        ? pageUrl?.includes("team/") || undefined
        : original?.isTeamBooking,
    referrer: "",
    onVercel,
    isAuthorized: !!cookies["next-auth.session-token"] || !!cookies["__Secure-next-auth.session-token"],
    utc_time: new Date().toISOString(),
  };
};

/**
 * @type {typeof useCollector}
 */
const useTelemetry = useCollector;

module.exports = {
  telemetryEventTypes,
  collectPageParameters,
  nextCollectBasicSettings,
  extendEventData,
  useTelemetry,
};
