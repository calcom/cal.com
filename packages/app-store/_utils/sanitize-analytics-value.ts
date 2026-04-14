const SAFE_CHARS = /[^a-zA-Z0-9\-._/:]/g;

const ANALYTICS_APPS = new Set([
  "ga4",
  "gtm",
  "metapixel",
  "fathom",
  "plausible",
  "posthog",
  "umami",
  "matomo",
  "databuddy",
  "insihts",
  "twipla",
]);

// These fields get substituted into inline script templates via BookingPageTagManager's parseValue
const TEMPLATE_FIELDS = [
  "trackingId",
  "trackingEvent",
  "TRACKING_ID",
  "TRACKING_EVENT",
  "API_HOST",
  "PLAUSIBLE_URL",
  "SCRIPT_URL",
  "SITE_ID",
  "MATOMO_URL",
  "CLIENT_ID",
  "DATABUDDY_SCRIPT_URL",
  "DATABUDDY_API_URL",
];

function sanitizeValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(SAFE_CHARS, "");
}

// Mutates metadata in place, sanitizing analytics app fields that are interpolated into script templates.
// Generic return preserves the caller's type without requiring extra assertions.
export function sanitizeAnalyticsApps<T>(metadata: T): T {
  if (!metadata || typeof metadata !== "object") return metadata;

  const obj = metadata as Record<string, unknown>;
  if (!obj.apps || typeof obj.apps !== "object") return metadata;

  const apps = obj.apps as Record<string, Record<string, unknown>>;

  for (const [slug, appData] of Object.entries(apps)) {
    if (!ANALYTICS_APPS.has(slug) || !appData || typeof appData !== "object") continue;

    for (const field of TEMPLATE_FIELDS) {
      if (field in appData && typeof appData[field] === "string" && appData[field] !== "") {
        appData[field] = sanitizeValue(appData[field]);
      }
    }
  }

  return metadata;
}
