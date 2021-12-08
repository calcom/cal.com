export const BASE_URL = process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
