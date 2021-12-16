export const BASE_URL = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Cal.com";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
