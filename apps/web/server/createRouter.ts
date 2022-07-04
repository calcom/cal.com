import { performance } from "@calcom/lib/server/perfObserver";

import * as trpc from "@trpc/server";

import { Context } from "./createContext";

/**
 * Helper function to create a router with context
 */
export function createRouter() {
  return trpc.router<Context>().middleware(async ({ path, type, next }) => {
    performance.mark("Start");
    const result = await next();
    performance.mark("End");
    performance.measure(`[${result.ok ? "OK" : "ERROR"}][$1] ${type} '${path}'`, "Start", "End");
    return result;
  });
}

export function createProtectedRouter() {
  return createRouter().middleware(({ ctx, next }) => {
    if (!ctx.user || !ctx.session) {
      throw new trpc.TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        ...ctx,
        // infers that `user` and `session` are non-nullable to downstream procedures
        session: ctx.session,
        user: ctx.user,
      },
    });
  });
}
