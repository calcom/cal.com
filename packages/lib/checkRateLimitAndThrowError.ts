import { httpError } from "./http-error";
import type { RateLimitHelper } from "./rateLimit";
import { rateLimiter } from "./rateLimit";

const rateLimitExceededError = (secondsToWait: number) =>
  httpError({
    statusCode: 429,
    message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
    cause: new Error("TOO_MANY_REQUESTS"),
  });

export async function checkRateLimitAndThrowError({
  rateLimitingType = "core",
  identifier,
}: RateLimitHelper) {
  const { remaining, reset } = await rateLimiter()({ rateLimitingType, identifier });

  if (remaining < 1) {
    const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
    const secondsToWait = convertToSeconds(reset - Date.now());
    throw rateLimitExceededError(secondsToWait);
  }
}
