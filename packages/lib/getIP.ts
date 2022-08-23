import type { NextApiRequest } from "next";
import z from "zod";

/**
 * Tries to extract IP address from a request
 * @see https://github.com/vercel/examples/blob/main/edge-functions/ip-blocking/lib/get-ip.ts
 **/
export default function getIP(request: Request | NextApiRequest) {
  const xff =
    request instanceof Request ? request.headers.get("x-forwarded-for") : request.headers["x-forwarded-for"];

  return xff ? (Array.isArray(xff) ? xff[0] : xff.split(",")[0]) : "127.0.0.1";
}

const banlistSchema = z.array(z.string());

export function isIpInBanlist(request: Request | NextApiRequest) {
  const IP = getIP(request);
  const rawBanListJson = process.env.IP_BANLIST || "[]";
  const banList = banlistSchema.parse(JSON.parse(rawBanListJson));
  if (banList.includes(IP)) {
    console.log(`Found banned IP: ${IP} in IP_BANLIST`);
    return true;
  }
  return false;
}
