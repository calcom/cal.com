import { t } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { perfMiddleware } from "../middlewares/perfMiddleware";
import { sessionMiddleware } from "../middlewares/sessionMiddleware";

export const authedProcedure = t.procedure
  .use(sessionMiddleware)
  .use(perfMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
    return next({ ctx: { ...ctx, user: ctx.session.user } });
  });

export const authedAdminProcedure = t.procedure
  .use(sessionMiddleware)
  .use(perfMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user?.id || !ctx.session?.user?.role || ctx.session.user.role !== "ADMIN")
      throw new TRPCError({ code: "UNAUTHORIZED" });
    return next({ ctx: { ...ctx, user: ctx.session.user } });
  });

export const authedOrgAdminProcedure = t.procedure
  .use(sessionMiddleware)
  .use(perfMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user?.id || !ctx.session?.user?.organizationId)
      throw new TRPCError({ code: "UNAUTHORIZED" });
    return next({ ctx: { ...ctx, user: ctx.session.user } });
  });
