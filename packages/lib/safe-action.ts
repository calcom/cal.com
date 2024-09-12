// Big insperation from https://github.com/midday-ai/midday/blob/24f30b7a46ec37d1e43a45d93caa9e09c1d9a5cb/apps/dashboard/src/actions/safe-action.ts
import * as Sentry from "@sentry/nextjs";
import { getServerSession as getNextAuthServerSession } from "next-auth/next";
import { DEFAULT_SERVER_ERROR_MESSAGE, createSafeActionClient } from "next-safe-action";
import { headers } from "next/headers";
import { z } from "zod";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";
import { MembershipRole } from "@calcom/prisma/enums";

import { checkRateLimit } from "./checkRateLimitAndThrowError";

const getServerSession = async () => {
  return getNextAuthServerSession(AUTH_OPTIONS);
};

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

// In our pages directory setup we all the db for every single request to get the user. Lets make this more efficient and not do that starting with server actions.
export const authActionClient = rateLimitClient.use(async ({ next, metadata, ctx }) => {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#instrument-nextjs-server-actions
  return Sentry.withServerActionInstrumentation(metadata.name, async () => {
    return next({
      ctx: {
        user: session.user,
      },
    });
  });
});

export const appAdminActionClient = authActionClient.use(async ({ next, metadata, ctx }) => {
  if (ctx?.user?.role !== "ADMIN") {
    throw new Error("Not authenticated");
  }

  return next({
    ctx,
  });
});

export const orgAdminActionClient = authActionClient.use(async ({ next, metadata, ctx }) => {
  const { user } = ctx;
  if (!user?.org) {
    throw new Error("Not authenticated");
  }

  if (user.org.role !== MembershipRole.OWNER && user.org.role !== MembershipRole.ADMIN) {
    throw new Error("Not authenticated");
  }
  return next({ ctx });
});
