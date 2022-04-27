export const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || `https://${process.env.VERCEL_URL}`;
/** @deprecated use `WEBAPP_URL` */
export const BASE_URL = WEBAPP_URL;
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://cal.com";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const TRIAL_LIMIT_DAYS = 14;
export const HOSTED_CAL_FEATURES = process.env.HOSTED_CAL_FEATURES || BASE_URL === "https://app.cal.com";
/** @deprecated use `WEBAPP_URL` */
export const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || `https://${process.env.VERCEL_URL}`;
export const VITAL_ENV = {
  mode: process.env.VITAL_DEVELOPMENT_MODE,
  region: "us",
  client_id: process.env.VITAL_CLIENT_ID,
  client_secret: process.env.VITAL_CLIENT_SECRET,
  webhook_secret: process.env.VITAL_WEBHOOK_SECRET,
};
