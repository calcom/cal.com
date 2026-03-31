import type { NextApiRequest } from "next";

import type { SMSRateLimitContext } from "./checkRateLimitAndThrowError";
import getIP from "./getIP";

function normalize(value: string | null | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 255) : undefined;
}

function resolveIp(request: unknown): string | undefined {
  if (!request) return undefined;

  try {
    return normalize(getIP(request as NextApiRequest));
  } catch {
    return undefined;
  }
}

export function getSMSAbuseRequestContext(request?: unknown): Pick<SMSRateLimitContext, "ipAddress"> {
  return {
    ipAddress: resolveIp(request),
  };
}
