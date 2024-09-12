import { DEFAULT_SERVER_ERROR_MESSAGE, createSafeActionClient } from "next-safe-action";
import { headers } from "next/headers";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { checkRateLimit } from "./checkRateLimitAndThrowError";

const handleServerError = (e: Error) => {
  console.error("Action error:", e.message);

  if (e instanceof Error) {
    return e.message;
  }

  return DEFAULT_SERVER_ERROR_MESSAGE;
};

export const actionClient = createSafeActionClient({
  handleServerError,
});

export const actionClientWithMeta = createSafeActionClient({
  handleServerError,
  defineMetadataSchema() {
    return z.object({
      // We can use name for ratelimiting
      name: z.string(),
      rateLimitingType: z
        .enum(["core", "forcedSlowMode", "common", "api", "ai", "sms", "smsMonth"])
        .optional(),
      // We can use track for analytics
      track: z
        .object({
          event: z.string(),
          channel: z.string(),
        })
        .optional(),
    });
  },
});

const rateLimitClient = actionClientWithMeta.use(async ({ next, metadata }) => {
  const ip = headers().get("x-forwarded-for");

  if (!metadata.rateLimitingType) {
    return next({ ctx: {} });
  }

  const response = await checkRateLimit({
    rateLimitingType: metadata.rateLimitingType,
    identifier: `${metadata.rateLimitingType}:${ip}:${metadata.name}`,
  });

  if (!response.success) {
    const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
    const secondsToWait = convertToSeconds(response.reset - Date.now());
    throw new Error(`Rate limit exceeded - Retry after ${secondsToWait} seconds`);
  }

  return next({
    ctx: {
      ratelimit: {
        remaining: response.remaining,
      },
    },
  });
});

export const authActionClient = actionClientWithMeta.use(async ({ next, metadata }) => {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  return next({ ctx: { session } });
});
