import { HttpError } from "./http-error";
import type { RateLimitHelper } from "./rateLimit";
import { rateLimiter } from "./rateLimit";

export async function checkRateLimitAndThrowError(req: RateLimitHelper | RateLimitHelper[]) {
  const reqs = Array.isArray(req) ? req : [req];

  const response = await rateLimiter()(...reqs);

  for (const req of reqs) {
    req.onRateLimiterResponse?.(response);
  }

  if (!response.passed) {
    const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
    const rejected = response.limits.find((limit) => !limit.passed);

    if (!rejected) {
      // This should never happen, but if the top level `.passed` is false there
      // was an exceeded ratelimit, so we can throw the same error
      throw new HttpError({
        statusCode: 429,
        message: "Rate limit exceeded. Try again in a minute.",
      });
    }

    const secondsToWait = convertToSeconds(rejected.reset - Date.now());
    throw new HttpError({
      statusCode: 429,
      message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
    });
  }
  return response;
}
