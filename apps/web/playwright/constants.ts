/**
 * NOTES: These values must be synchronized with packages/lib/constants.
 */

export const IS_STRIPE_ENABLED = !!(
  process.env.STRIPE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_PRIVATE_KEY
);

export const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "";
export const RAILWAY_STATIC_URL = process.env.RAILWAY_STATIC_URL
  ? `https://${process.env.RAILWAY_STATIC_URL}`
  : "";
export const HEROKU_URL = process.env.HEROKU_APP_NAME
  ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`
  : "";
export const RENDER_URL = process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : "";

export const WEBAPP_URL =
  process.env.NEXT_PUBLIC_WEBAPP_URL ||
  VERCEL_URL ||
  RAILWAY_STATIC_URL ||
  HEROKU_URL ||
  RENDER_URL ||
  "http://localhost:3000";

export const IS_SELF_HOSTED = !(
  new URL(WEBAPP_URL).hostname.endsWith(".cal.dev") || !!new URL(WEBAPP_URL).hostname.endsWith(".cal.com")
);

export const EMBED_LIB_URL = process.env.NEXT_PUBLIC_EMBED_LIB_URL || `${WEBAPP_URL}/embed/embed.js`;

export const HOSTED_CAL_FEATURES = process.env.NEXT_PUBLIC_HOSTED_CAL_FEATURES || !IS_SELF_HOSTED;

export const IS_TEAM_BILLING_ENABLED = IS_STRIPE_ENABLED && HOSTED_CAL_FEATURES;

export const IS_MAILHOG_ENABLED = process.env.E2E_TEST_MAILHOG_ENABLED === "1";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Cal.com";

export const IS_CALCOM =
  WEBAPP_URL &&
  (new URL(WEBAPP_URL).hostname.endsWith("cal.com") ||
    new URL(WEBAPP_URL).hostname.endsWith("cal.dev") ||
    new URL(WEBAPP_URL).hostname.endsWith("cal.qa") ||
    new URL(WEBAPP_URL).hostname.endsWith("cal-staging.com"));

export const IS_PREMIUM_USERNAME_ENABLED =
  (IS_CALCOM || (process.env.NEXT_PUBLIC_IS_E2E && IS_STRIPE_ENABLED)) &&
  process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRICE_MONTHLY;
