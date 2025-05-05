import type { PrismaClient } from "@prisma/client";
import { captureException } from "@sentry/nextjs";
import { performance } from "perf_hooks";

import logger from "@calcom/lib/logger";

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500;

const RATE_LIMIT_PERIOD_MS = 60000; // 1 minute

let lastReportTime = 0;

type PrismaMiddlewareParams = {
  model?: string;
  action: string;
  args: Record<string, unknown>;
};

type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<unknown>;

function middleware(prisma: PrismaClient | Record<string, unknown>) {
  if (typeof prisma.$use !== "function") {
    logger.warn("Slow query detection middleware not applied: client does not support $use method");
    return;
  }

  /***********************************/
  /* SLOW QUERY DETECTION MIDDLEWARE */
  /***********************************/
  prisma.$use(async (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => {
    const startTime = performance.now();

    const result = await next(params);

    const endTime = performance.now();
    const duration = endTime - startTime;

    const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || "") || DEFAULT_SLOW_QUERY_THRESHOLD_MS;

    if (duration > threshold) {
      const now = Date.now();
      if (now - lastReportTime > RATE_LIMIT_PERIOD_MS) {
        lastReportTime = now;

        const queryDetails = {
          model: params.model,
          action: params.action,
          args: JSON.stringify(params.args),
          duration: Math.round(duration),
          timestamp: new Date().toISOString(),
        };

        captureException(new Error(`Slow Prisma Query: ${duration.toFixed(2)}ms`), {
          extra: {
            query: queryDetails,
          },
          tags: {
            type: "slow_query",
            model: params.model || "unknown",
            action: params.action,
          },
        });

        if (process.env.NODE_ENV !== "production") {
          logger.warn(
            `Slow Prisma Query (${duration.toFixed(2)}ms) - Model: ${params.model}, Action: ${params.action}`,
            { query: queryDetails }
          );
        }
      }
    }

    return result;
  });
}

export default middleware;
