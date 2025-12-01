import { HttpError } from "./http-error";
import type { RateLimitHelper } from "./rateLimit";
import { rateLimiter } from "./rateLimit";

export async function checkRateLimitAndThrowError({
  rateLimitingType = "core",
  identifier,
  onRateLimiterResponse,
  opts,
}: RateLimitHelper) {
  const response = await rateLimiter()({ rateLimitingType, identifier, opts });
  if (onRateLimiterResponse) onRateLimiterResponse(response);
  const { success, reset } = response;
  if (!success) {
    const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
    const secondsToWait = convertToSeconds(reset - Date.now());
    throw new HttpError({
      statusCode: 429,
      message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
    });
  }
  return response;
}
