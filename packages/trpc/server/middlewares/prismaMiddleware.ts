import { getPrismaFromHost, runWithTenants } from "@calcom/prisma/store/prismaStore";
import { getTenantFromHost } from "@calcom/prisma/store/tenants";

import { middleware } from "../trpc";

/**
 * Middleware that selects the appropriate Prisma client based on the request host.
 * This middleware should be used in all tRPC procedures to ensure proper tenant selection.
 *
 * IMPORTANT: Do not import prisma directly in tRPC procedures. Use ctx.prisma instead.
 * @example
 * ```ts
 * // ❌ Don't do this
 * import prisma from "@calcom/prisma";
 * const myProcedure = publicProcedure.query(async () => {
 *   const users = await prisma.user.findMany();
 *   return users;
 * });
 *
 * // ✅ Do this instead
 * const myProcedure = publicProcedure.query(async ({ ctx }) => {
 *   const users = await ctx.prisma.user.findMany();
 *   return users;
 * });
 * ```
 */
const prismaMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.req) {
    return next();
  }

  const host = ctx.req.headers.host || "";

  const tenant = getTenantFromHost(host);

  return runWithTenants(tenant, async () => {
    const prisma = getPrismaFromHost(host);
    return next({
      ctx: {
        ...ctx,
        prisma,
      },
    });
  });
});

export default prismaMiddleware;
