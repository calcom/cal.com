import { captureException } from "@sentry/nextjs";
import { performance } from "perf_hooks";

import logger from "@calcom/lib/logger";

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500;
const RATE_LIMIT_PERIOD_MS = 60000; // 1 minute

type PrismaClientLike = {
  $use?: (callback: any) => void;
  $on?: any;
};

const clientState = new WeakMap<
  object,
  {
    lastReportTime: number;
    queryMap: Map<string, { sql: string; timestamp: number }>;
    cleanupInterval: NodeJS.Timeout | null;
  }
>();

type PrismaMiddlewareParams = {
  model?: string;
  action: string;
  args: Record<string, unknown>;
};

type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<unknown>;

function middleware(prisma: any) {
  if (typeof prisma.$use !== "function") {
    logger.warn("Slow query detection middleware not applied: client does not support $use method");
    return;
  }

  if (!clientState.has(prisma)) {
    clientState.set(prisma, {
      lastReportTime: 0,
      queryMap: new Map<string, { sql: string; timestamp: number }>(),
      cleanupInterval: null,
    });

    const state = clientState.get(prisma)!;
    state.cleanupInterval = setInterval(() => {
      const now = Date.now();
      Array.from(state.queryMap.entries()).forEach(([key, value]) => {
        if (now - value.timestamp > 10000) {
          state.queryMap.delete(key);
        }
      });
    }, 30000); // Run cleanup every 30 seconds
  }

  const state = clientState.get(prisma)!;

  if (typeof prisma.$on === "function") {
    try {
      prisma.$on("query", (event: any) => {
        if (event && typeof event === "object") {
          const queryId = `${event.timestamp || Date.now()}-${Math.random()}`;
          state.queryMap.set(queryId, {
            sql: event.query || "SQL not captured",
            timestamp: event.timestamp || Date.now(),
          });

          setTimeout(() => {
            state.queryMap.delete(queryId);
          }, 10000);
        }
      });
    } catch (error) {
      logger.warn("Failed to register query event listener", { error });
    }
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
      if (now - state.lastReportTime > RATE_LIMIT_PERIOD_MS) {
        state.lastReportTime = now;

        let rawSql = "SQL not captured";
        let closestTimeDiff = Infinity;

        Array.from(state.queryMap.entries()).forEach(([_, queryData]) => {
          const timeDiff = Math.abs(queryData.timestamp - executionTimestamp);
          if (timeDiff < closestTimeDiff) {
            closestTimeDiff = timeDiff;
            rawSql = queryData.sql;
          }
        });

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
