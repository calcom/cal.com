import type { PrismaClient } from "@prisma/client";
import { captureException } from "@sentry/nextjs";
import { performance } from "perf_hooks";

import logger from "@calcom/lib/logger";

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500;

const RATE_LIMIT_PERIOD_MS = 60000; // 1 minute

let lastReportTime = 0;

const queryMap = new Map<string, { sql: string; timestamp: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryMap.entries()) {
    if (now - value.timestamp > 10000) {
      // Remove entries older than 10 seconds
      queryMap.delete(key);
    }
  }
}, 30000); // Run cleanup every 30 seconds

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

  if (typeof (prisma as PrismaClient).$on === "function") {
    (prisma as PrismaClient).$on("query", (event) => {
      const queryId = `${event.timestamp}-${Math.random()}`;
      queryMap.set(queryId, {
        sql: event.query,
        timestamp: event.timestamp,
      });

      setTimeout(() => {
        queryMap.delete(queryId);
      }, 10000);
    });
  }

  /***********************************/
  /* SLOW QUERY DETECTION MIDDLEWARE */
  /***********************************/
  prisma.$use(async (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => {
    const startTime = performance.now();
    const executionTimestamp = Date.now();

    const result = await next(params);

    const endTime = performance.now();
    const duration = endTime - startTime;

    const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || "") || DEFAULT_SLOW_QUERY_THRESHOLD_MS;

    if (duration > threshold) {
      const now = Date.now();
      if (now - lastReportTime > RATE_LIMIT_PERIOD_MS) {
        lastReportTime = now;

        let rawSql = "SQL not captured";
        let closestTimeDiff = Infinity;

        for (const [_, queryData] of queryMap.entries()) {
          const timeDiff = Math.abs(queryData.timestamp - executionTimestamp);
          if (timeDiff < closestTimeDiff) {
            closestTimeDiff = timeDiff;
            rawSql = queryData.sql;
          }
        }

        const queryDetails = {
          model: params.model,
          action: params.action,
          args: JSON.stringify(params.args),
          duration: Math.round(duration),
          sql: rawSql,
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
