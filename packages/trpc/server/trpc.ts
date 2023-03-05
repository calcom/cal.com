import superjson from "superjson";

import rateLimit from "@calcom/lib/rateLimit";

import { initTRPC, TRPCError } from "@trpc/server";

import type { createContext } from "./createContext";

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

const perfMiddleware = t.middleware(async ({ path, type, next }) => {
  performance.mark("Start");
  const result = await next();
  performance.mark("End");
  performance.measure(`[${result.ok ? "OK" : "ERROR"}][$1] ${type} '${path}'`, "Start", "End");
  return result;
});

const isAuthedMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      // infers that `user` and `session` are non-nullable to downstream procedures
      session: ctx.session,
      user: ctx.user,
    },
  });
});

const isAdminMiddleware = isAuthedMiddleware.unstable_pipe(({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { user: ctx.user },
  });
});

interface IRateLimitOptions {
  intervalInMs: number;
  limit: number;
}
const isRateLimitedByUserIdMiddleware = ({ intervalInMs, limit }: IRateLimitOptions) =>
  t.middleware(({ ctx, next }) => {
    // validate user exists
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const { isRateLimited } = rateLimit({ intervalInMs }).check(limit, ctx.user.id.toString());

    if (isRateLimited) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    }

    return next({
      ctx: {
        // infers that `user` and `session` are non-nullable to downstream procedures
        session: ctx.session,
        user: ctx.user,
      },
    });
  });

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const middleware = t.middleware;
export const publicProcedure = t.procedure.use(perfMiddleware);
export const authedProcedure = t.procedure.use(perfMiddleware).use(isAuthedMiddleware);
export const authedRateLimitedProcedure = ({ intervalInMs, limit }: IRateLimitOptions) =>
  t.procedure
    .use(perfMiddleware)
    .use(isAuthedMiddleware)
    .use(isRateLimitedByUserIdMiddleware({ intervalInMs, limit }));

export const authedAdminProcedure = t.procedure.use(perfMiddleware).use(isAdminMiddleware);
