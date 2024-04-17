import prisma from "@calcom/prisma";
import { SmsLockState } from "@calcom/prisma/enums";
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
  const { reset, success } = response;

  if (onRateLimiterResponse) onRateLimiterResponse(response);
  if (!success) {
    if (rateLimitingType === "sms" || "smsMonth") {
      await changeSMSLockStatus(
        identifier,
        rateLimitingType === "sms" ? SmsLockState.LOCKED : SmsLockState.REVIEW_NEEDED
      );
    } else {
      const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
      const secondsToWait = convertToSeconds(reset - Date.now());
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
      });
    }
  }
}

async function changeSMSLockStatus(identifier: string, status: SmsLockState) {
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
      },
      data: {
        smsLockStatus: status,
      },
    });
  } else {
    await prisma.user.update({
      where: {
        id: teamId,
      },
      data: {
        smsLockStatus: status,
      },
    });
  }
}
