import type { GetServerSidePropsContext } from "next";

import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { prisma } from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";

import getIP from "./getIP";
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
  const { success, reset } = response;

  if (onRateLimiterResponse) onRateLimiterResponse(response);

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

/**
 * Sets context.res.statusCode to 429 and returns props with errorMessage when rate limited.
 * This ensures the 429 status code is properly returned (unlike notFound which returns 404).
 *
 * @param context - Next.js GetServerSidePropsContext
 * @param identifierSuffix - Suffix to append to the rate limit identifier (e.g., "[user]/[type]")
 * @param rateLimitingType - Type of rate limiting (default: "core")
 * @param opts - Optional rate limit options
 * @returns null if rate limit passes, or a Next.js response object with props containing errorMessage if rate limited
 *
 * @example
 * ```ts
 * export const getServerSideProps = async (context: GetServerSidePropsContext) => {
 *   const rateLimitResponse = await handleRateLimitForNextJs(context, "[user]/[type]");
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Continue with normal logic...
 * }
 * ```
 */
export async function handleRateLimitForNextJs(
  context: GetServerSidePropsContext,
  identifierSuffix: string,
  rateLimitingType: RateLimitHelper["rateLimitingType"] = "core",
  opts?: RateLimitHelper["opts"]
): Promise<{ props: { errorMessage: string } } | null> {
  const requestorIp = getIP(context.req as unknown as Request);
  const rateLimitResult = await checkRateLimitForNextJs({
    rateLimitingType,
    identifier: `${identifierSuffix}-${piiHasher.hash(requestorIp)}`,
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

export async function checkSMSRateLimit({
  rateLimitingType = "sms",
  identifier,
  onRateLimiterResponse,
  opts,
}: RateLimitHelper) {
  const response = await rateLimiter()({ rateLimitingType, identifier, opts });
  const { success } = response;

  if (onRateLimiterResponse) onRateLimiterResponse(response);

  if (!success) {
    await changeSMSLockState(
      identifier,
      rateLimitingType === "sms" ? SMSLockState.LOCKED : SMSLockState.REVIEW_NEEDED
    );
  }
}

async function changeSMSLockState(identifier: string, status: SMSLockState) {
  let userId, teamId;

  if (identifier.startsWith("sms:user:")) {
    userId = Number(identifier.slice(9));
  } else if (identifier.startsWith("sms:team:")) {
    teamId = Number(identifier.slice(9));
  }

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId, profiles: { none: {} } } });
    if (user?.smsLockReviewedByAdmin) return;

    await prisma.user.update({
      where: {
        id: userId,
        profiles: { none: {} },
      },
      data: {
        smsLockState: status,
      },
    });
  } else {
    const team = await prisma.team.findUnique({
      where: { id: teamId, parentId: null, isOrganization: false },
    });
    if (team?.smsLockReviewedByAdmin) return;

    await prisma.team.update({
      where: {
        id: teamId,
        parentId: null,
        isOrganization: false,
      },
      data: {
        smsLockState: status,
      },
    });
  }
}
