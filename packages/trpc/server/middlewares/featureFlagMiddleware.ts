import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import logger from "@calcom/lib/logger";

import { TRPCError } from "@trpc/server";

import { middleware } from "../trpc";

export const isOrganizationFeatureEnabled = middleware(async ({ ctx, next }) => {
  const middlewareStart = performance.now();

  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const organizationsEnabled = await getFeatureFlag(prisma, "organizations");

  const middlewareEnd = performance.now();
  logger.debug("Perf:t.isAuthed", middlewareEnd - middlewareStart);

  if (!organizationsEnabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organizations feature is disabled on this instance",
    });
  }

  return next({
    ctx,
  });
});
