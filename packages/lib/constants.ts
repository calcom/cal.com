import dayjs from "@calcom/dayjs";

const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "";
const RAILWAY_STATIC_URL = process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : "";
const HEROKU_URL = process.env.HEROKU_APP_NAME ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com` : "";
const RENDER_URL = process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : "";
export const CALCOM_ENV = process.env.CALCOM_ENV || process.env.NODE_ENV;
export const IS_PRODUCTION = CALCOM_ENV === "production";
export const IS_PRODUCTION_BUILD = process.env.NODE_ENV === "production";
const IS_DEV = CALCOM_ENV === "development";

/** https://app.cal.com */
export const WEBAPP_URL =
  process.env.NEXT_PUBLIC_WEBAPP_URL ||
  VERCEL_URL ||
  RAILWAY_STATIC_URL ||
  HEROKU_URL ||
  RENDER_URL ||
  "http://localhost:3000";

// OAuth needs to have HTTPS(which is not generally setup locally) and a valid tld(*.local isn't a valid tld)
// So for development purpose, we would stick to localhost only
export const WEBAPP_URL_FOR_OAUTH = IS_PRODUCTION || IS_DEV ? WEBAPP_URL : "http://localhost:3000";

/** @deprecated use `WEBAPP_URL` */
export const BASE_URL = WEBAPP_URL;
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://cal.com";
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Cal.com";
export const SUPPORT_MAIL_ADDRESS = process.env.NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS || "help@cal.com";
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Cal.com, Inc.";
export const SENDER_ID = process.env.NEXT_PUBLIC_SENDER_ID || "Cal";
export const SENDER_NAME = process.env.NEXT_PUBLIC_SENDGRID_SENDER_NAME || "Cal.com";
export const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || APP_NAME;

// This is the URL from which all Cal Links and their assets are served.
// Use website URL to make links shorter(cal.com and not app.cal.com)
// As website isn't setup for preview environments, use the webapp url instead
// If it's a .vercel.app domain, keep it.
// Else use the website url if defined and finally fallback to the webapp url
export const CAL_URL = new URL(WEBAPP_URL).hostname.endsWith(".vercel.app")
  ? WEBAPP_URL
  : process.env.NEXT_PUBLIC_WEBSITE_URL || WEBAPP_URL;

export const IS_CALCOM =
  WEBAPP_URL &&
  (new URL(WEBAPP_URL).hostname.endsWith("cal.com") ||
    new URL(WEBAPP_URL).hostname.endsWith("cal.dev") ||
    new URL(WEBAPP_URL).hostname.endsWith("cal.qa") ||
    new URL(WEBAPP_URL).hostname.endsWith("cal-staging.com"));

export const CONSOLE_URL =
  new URL(WEBAPP_URL).hostname.endsWith(".cal.dev") ||
  new URL(WEBAPP_URL).hostname.endsWith(".cal.qa") ||
  new URL(WEBAPP_URL).hostname.endsWith(".cal-staging.com") ||
  process.env.NODE_ENV !== "production"
    ? `https://console.cal.dev`
    : `https://console.cal.com`;
export const IS_SELF_HOSTED = !(
  new URL(WEBAPP_URL).hostname.endsWith(".cal.dev") || new URL(WEBAPP_URL).hostname.endsWith(".cal.com")
);
export const EMBED_LIB_URL = process.env.NEXT_PUBLIC_EMBED_LIB_URL || `${WEBAPP_URL}/embed/embed.js`;
export const TRIAL_LIMIT_DAYS = 14;

export const HOSTED_CAL_FEATURES = process.env.NEXT_PUBLIC_HOSTED_CAL_FEATURES || !IS_SELF_HOSTED;

export const IS_EUROPE = dayjs.tz.guess()?.indexOf("Europe") !== -1;

export const CURRENT_TIMEZONE = dayjs.tz.guess() !== "Etc/Unknown" ? dayjs.tz.guess() : "Europe/London";

/** @deprecated use `WEBAPP_URL` */
export const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || `https://${process.env.VERCEL_URL}`;
export const LOGO = "/calcom-logo-white-word.svg";
export const LOGO_ICON = "/cal-com-icon-white.svg";
export const AVATAR_FALLBACK = "/avatar.svg";
export const FAVICON_16 = "/favicon-16x16.png";
export const FAVICON_32 = "/favicon-32x32.png";
export const APPLE_TOUCH_ICON = "/apple-touch-icon.png";
export const MSTILE_ICON = "/mstile-150x150.png";
export const ANDROID_CHROME_ICON_192 = "/android-chrome-192x192.png";
export const ANDROID_CHROME_ICON_256 = "/android-chrome-256x256.png";
export const ROADMAP = "https://cal.com/roadmap";
export const DESKTOP_APP_LINK = "https://cal.com/download";
export const JOIN_COMMUNITY = "https://github.com/calcom/cal.com/discussions";
export const POWERED_BY_URL = "https://go.cal.com/booking";
export const DOCS_URL = "https://cal.com/docs";
export const DEVELOPER_DOCS = "https://developer.cal.com";
export const SEO_IMG_DEFAULT = `${CAL_URL}/og-image.png`;
// The Dynamic OG Image is passed through Next's Image API to further optimize it.
// This results in a 80% smaller image 🤯. It is however important that for the query
// parameters you pass to the /api/social/og/image endpoint, you wrap them in encodeURIComponent
// as well, otherwise the URL won't be valid.
export const SEO_IMG_OGIMG = `${CAL_URL}/_next/image?w=1200&q=100&url=`;
export const SEO_IMG_OGIMG_VIDEO = `${CAL_URL}/video-og-image.png`;
export const IS_STRIPE_ENABLED = !!(
  process.env.STRIPE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_PRIVATE_KEY
);
/** This has correct value only server side. When you want to use client side, go for IS_TEAM_BILLING_ENABLED_CLIENT. I think we should use the _CLIENT one only everywhere so that it works reliably everywhere on client as well as server  */
export const IS_TEAM_BILLING_ENABLED = IS_STRIPE_ENABLED && HOSTED_CAL_FEATURES;

export const IS_TEAM_BILLING_ENABLED_CLIENT =
  !!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY && HOSTED_CAL_FEATURES;

export const FULL_NAME_LENGTH_MAX_LIMIT = 50;
export const MINUTES_TO_BOOK = process.env.NEXT_PUBLIC_MINUTES_TO_BOOK || "5";
export const ENABLE_PROFILE_SWITCHER = process.env.NEXT_PUBLIC_ENABLE_PROFILE_SWITCHER === "1";
// Needed for orgs
export const ALLOWED_HOSTNAMES = JSON.parse(`[${process.env.ALLOWED_HOSTNAMES || ""}]`) as string[];
export const RESERVED_SUBDOMAINS = JSON.parse(`[${process.env.RESERVED_SUBDOMAINS || ""}]`) as string[];

export const ORGANIZATION_SELF_SERVE_MIN_SEATS =
  process.env.NEXT_PUBLIC_ORGANIZATIONS_MIN_SELF_SERVE_SEATS || 30;
export const ORGANIZATION_SELF_SERVE_PRICE = process.env.NEXT_PUBLIC_ORGANIZATIONS_SELF_SERVE_PRICE || 3700;

export const ORGANIZATION_MIN_SEATS = 30;

// Needed for emails in E2E
export const IS_MAILHOG_ENABLED = process.env.E2E_TEST_MAILHOG_ENABLED === "1";
export const CALCOM_VERSION = process.env.NEXT_PUBLIC_CALCOM_VERSION as string;

export const APP_CREDENTIAL_SHARING_ENABLED =
  !!process.env.CALCOM_CREDENTIAL_SYNC_SECRET && !!process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY;
export const CREDENTIAL_SYNC_SECRET = process.env.CALCOM_CREDENTIAL_SYNC_SECRET;
export const CREDENTIAL_SYNC_SECRET_HEADER_NAME =
  process.env.CALCOM_CREDENTIAL_SYNC_HEADER_NAME || "calcom-credential-sync-secret";

export const CREDENTIAL_SYNC_ENDPOINT = process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT;

export const DEFAULT_LIGHT_BRAND_COLOR = "#292929";
export const DEFAULT_DARK_BRAND_COLOR = "#fafafa";

export const TOP_BANNER_HEIGHT = 40;

const defaultOnNaN = (testedValue: number, defaultValue: number) =>
  !Number.isNaN(testedValue) ? testedValue : defaultValue;

export const AB_TEST_BUCKET_PROBABILITY = defaultOnNaN(
  parseInt(process.env.AB_TEST_BUCKET_PROBABILITY ?? "10", 10),
  10
);

export const IS_PREMIUM_USERNAME_ENABLED =
  (IS_CALCOM || (process.env.NEXT_PUBLIC_IS_E2E && IS_STRIPE_ENABLED)) &&
  process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRICE_MONTHLY;

// Max number of invites to join a team/org that can be sent at once
export const MAX_NB_INVITES = 100;

export const URL_PROTOCOL_REGEX = /(^\w+:|^)\/\//;
export const FUTURE_ROUTES_OVERRIDE_COOKIE_NAME = "x-calcom-future-routes-override";
export const FUTURE_ROUTES_ENABLED_COOKIE_NAME = "x-calcom-future-routes-enabled";

export const IS_VISUAL_REGRESSION_TESTING = Boolean(globalThis.window?.Meticulous?.isRunningAsTest);

export const BOOKER_NUMBER_OF_DAYS_TO_LOAD = parseInt(
  process.env.NEXT_PUBLIC_BOOKER_NUMBER_OF_DAYS_TO_LOAD ?? "0",
  0
);

export const CLOUDFLARE_SITE_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_SITEKEY;
export const MINIMUM_NUMBER_OF_ORG_SEATS = 30;
export const ORG_SELF_SERVE_ENABLED = process.env.NEXT_PUBLIC_ORG_SELF_SERVE_ENABLED === "1";
export const ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE = 0;
export const ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE_HELPER_DIALOGUE = 2;

export const CALCOM_PRIVATE_API_ROUTE = process.env.CALCOM_PRIVATE_API_ROUTE || "https://goblin.cal.com";
export const WEBSITE_PRIVACY_POLICY_URL =
  process.env.NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL || "https://cal.com/privacy";
export const WEBSITE_TERMS_URL = process.env.NEXT_PUBLIC_WEBSITE_TERMS_URL || "https://cal.com/terms";
export const REPLEXICA_API_KEY = process.env.REPLEXICA_API_KEY;

/**
 * The maximum number of days we should check for if we don't find all required bookable days
 * Counter start from current day and we would like to not go beyond 2 months(max days possible) from current day.
 */
export const ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK = 30 + 31;

export const TRANSCRIPTION_STARTED_ICON = IS_PRODUCTION
  ? `${WEBAPP_URL}/sparkles-red.svg`
  : `https://app.cal.com/sparkles-red.svg`;

export const TRANSCRIPTION_STOPPED_ICON = IS_PRODUCTION
  ? `${WEBAPP_URL}/sparkles.svg`
  : `https://app.cal.com/sparkles.svg`;

export const RECORDING_DEFAULT_ICON = IS_PRODUCTION
  ? `${WEBAPP_URL}/start-recording.svg`
  : `https://app.cal.com/start-recording.svg`;

export const RECORDING_IN_PROGRESS_ICON = IS_PRODUCTION
  ? `${WEBAPP_URL}/stop-recording.svg`
  : `https://app.cal.com/stop-recording.svg`;

export const SCOPE_USERINFO_PROFILE = "https://www.googleapis.com/auth/userinfo.profile";
export const SCOPE_USERINFO_EMAIL = "https://www.googleapis.com/auth/userinfo.email";
export const GOOGLE_OAUTH_SCOPES = [SCOPE_USERINFO_PROFILE, SCOPE_USERINFO_EMAIL];
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];
export const DIRECTORY_IDS_TO_LOG = process.env.DIRECTORY_IDS_TO_LOG?.split(",") || [];
