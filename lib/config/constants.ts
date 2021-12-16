export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const BASE_URL = process.env.IS_SANDBOX
  ? `https://https://calendso-sandbox.vercel.app`
  : IS_PRODUCTION
  ? `https://bookings.bullbitcoin.com`
  : process.env.BASE_URL || `https://${process.env.VERCEL_URL}`;
