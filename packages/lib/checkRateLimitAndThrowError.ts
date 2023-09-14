import { TRPCError } from "@calcom/trpc";

import type { RateLimitHelper } from "./rateLimit";
import { rateLimiter } from "./rateLimit";

export async function checkRateLimitAndThrowError({
  rateLimitingType = "core",
  identifier,
}: RateLimitHelper) {
  const { remaining, reset } = await rateLimiter()({ rateLimitingType, identifier });

  if (remaining < 0) {
    const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
    const secondsToWait = convertToSeconds(reset - Date.now());
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
    });
  }
}
