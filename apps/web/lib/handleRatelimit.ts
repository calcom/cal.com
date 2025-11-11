import type { GetServerSidePropsContext } from "next";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";
import type { RateLimitHelper } from "@calcom/lib/rateLimit";

async function checkRateLimitForNextJs({
  rateLimitingType = "core",
  identifier,
  opts,
}: Pick<RateLimitHelper, "rateLimitingType" | "identifier" | "opts">): Promise<
  { success: true } | { success: false; error: { statusCode: number; message: string } }
> {
  try {
    await checkRateLimitAndThrowError({ rateLimitingType, identifier, opts });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        success: false,
        error: {
          statusCode: error.statusCode,
          message: error.message,
        },
      };
    }
    throw error;
  }
}

/**
 * Sets context.res.statusCode to 429 and returns props with errorMessage when rate limited.
 * This ensures the 429 status code is properly returned (unlike notFound which returns 404).
 *
 * @param context - Next.js GetServerSidePropsContext
 * @param identifier - Full identifier string for rate limiting (e.g., "[user]/[type]-hashed-ip")
 * @param rateLimitingType - Type of rate limiting (default: "core") (see RateLimitHelper["rateLimitingType"])
 * @param opts - Optional rate limit options
 * @returns null if rate limit passes, or a Next.js response object with props containing errorMessage if rate limited
 *
 * @example
 * ```ts
 * import { getIP } from "@calcom/lib/getIP";
 * import { piiHasher } from "@calcom/lib/server/PiiHasher";
 *
 * export const getServerSideProps = async (context: GetServerSidePropsContext) => {
 *   const requestorIp = getIP(context.req as unknown as Request);
 *   const identifier = `[user]/[type]-${piiHasher.hash(requestorIp)}`;
 *   const rateLimitResponse = await handleRateLimitForNextJs(context, identifier);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Continue with normal logic...
 * }
 * ```
 */
export async function handleRateLimitForNextJs(
  context: GetServerSidePropsContext,
  identifier: string,
  rateLimitingType: RateLimitHelper["rateLimitingType"] = "core",
  opts?: RateLimitHelper["opts"]
): Promise<{ props: { errorMessage: string } } | null> {
  const rateLimitResult = await checkRateLimitForNextJs({
    rateLimitingType,
    identifier,
    opts,
  });

  if (!rateLimitResult.success) {
    context.res.statusCode = rateLimitResult.error.statusCode;
    return {
      props: {
        errorMessage: rateLimitResult.error.message,
      },
    };
  }

  return null;
}

