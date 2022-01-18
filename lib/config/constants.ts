export const BASE_URL = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
export const WEBSITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cal.com";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const TRIAL_LIMIT_DAYS = 14;
