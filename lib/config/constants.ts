export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const BASE_URL = IS_PRODUCTION
  ? `https://bookings.bullbitcoin.com`
  : process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
