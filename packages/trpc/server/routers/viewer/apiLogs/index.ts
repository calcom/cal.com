import { authedProcedure, router } from "@calcom/trpc/server/trpc";
import { ZGetApiLogsInput, ZGetApiLogDetailInput, ZGetApiLogsStatsInput } from "./apiLogs.schema";

type ApiLogsRouterHandlerCache = {
  list?: typeof import("./apiLogs.handler").getApiLogsHandler;
  detail?: typeof import("./apiLogs.handler").getApiLogDetailHandler;
  stats?: typeof import("./apiLogs.handler").getApiLogsStatsHandler;
};

const UNSTABLE_HANDLER_CACHE: ApiLogsRouterHandlerCache = {};

export const apiLogsRouter = router({
  list: authedProcedure.input(ZGetApiLogsInput).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.list) {
      UNSTABLE_HANDLER_CACHE.list = await import("./apiLogs.handler").then(
        (mod) => mod.getApiLogsHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.list) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.list({ ctx, input });
  }),

  detail: authedProcedure.input(ZGetApiLogDetailInput).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.detail) {
      UNSTABLE_HANDLER_CACHE.detail = await import("./apiLogs.handler").then(
        (mod) => mod.getApiLogDetailHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.detail) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.detail({ ctx, input });
  }),

  stats: authedProcedure.input(ZGetApiLogsStatsInput).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.stats) {
      UNSTABLE_HANDLER_CACHE.stats = await import("./apiLogs.handler").then(
        (mod) => mod.getApiLogsStatsHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.stats) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.stats({ ctx, input });
  }),
});
