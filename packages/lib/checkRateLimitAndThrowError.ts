import prisma from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";
import { TRPCError } from "@calcom/trpc/server";

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
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
    });
  }
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
