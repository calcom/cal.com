import process from "node:process";
import type { NextApiRequest } from "next";
import z from "zod";
import logger from "./logger";

export function parseIpFromHeaders(value: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value.split(",")[0];
  return raw.trim();
}

/**
 * Headers checked in priority order for CF → Vercel proxy chain.
 *
 * When Cloudflare proxies to Vercel, the request passes through multiple hops:
 *   Client → Cloudflare Edge → Vercel Edge → Serverless Function (AWS Lambda)
 *
 * Vercel's internal routing may strip or override upstream headers before they
 * reach the serverless function.  We check both Cloudflare-origin headers and
 * Vercel-specific headers.
 *
 *  1. cf-connecting-ip        – set by Cloudflare with the real client IP
 *  2. true-client-ip          – set by CF Enterprise / Managed Transforms
 *  3. x-vercel-forwarded-for  – Vercel's own forwarded-for chain; preserves
 *                               the original client IP even after internal hops
 *  4. x-forwarded-for         – standard proxy header; first IP is the client
 *  5. x-vercel-proxied-for    – alternative Vercel header for proxied requests
 *  6. x-real-ip               – set by Vercel to the *connecting* IP (CF edge
 *                               or internal LB IP — least reliable)
 *
 * @see https://vercel.com/docs/security/reverse-proxy
 * @see https://developers.cloudflare.com/fundamentals/reference/http-headers/
 **/
export const IP_HEADERS: readonly string[] = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-vercel-forwarded-for",
  "x-forwarded-for",
  "x-vercel-proxied-for",
  "x-real-ip",
];

export default function getIP(request: Request | NextApiRequest) {
  for (const header of IP_HEADERS) {
    const value = request instanceof Request ? request.headers.get(header) : request.headers[header];
    if (value) {
      return parseIpFromHeaders(value);
    }
  }

  return "127.0.0.1";
}

const banlistSchema = z.array(z.string());

export function isIpInBanlist(request: Request | NextApiRequest) {
  const IP = getIP(request);
  const rawBanListJson = process.env.IP_BANLIST || "[]";
  const banList = banlistSchema.parse(JSON.parse(rawBanListJson));
  if (banList.includes(IP)) {
    logger.warn(`Found banned IP: ${IP} in IP_BANLIST`);
    return true;
  }
  return false;
}

export function isIpInBanListString(identifer: string) {
  const rawBanListJson = process.env.IP_BANLIST || "[]";
  const banList = banlistSchema.parse(JSON.parse(rawBanListJson));
  if (banList.includes(identifer)) {
    logger.warn(`Found banned IP: ${identifer} in IP_BANLIST`);
    return true;
  }
  return false;
}
