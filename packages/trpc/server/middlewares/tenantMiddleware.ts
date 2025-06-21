import { getPrisma, runWithTenants } from "@calcom/prisma/store/prismaStore";
import { getTenantFromHost } from "@calcom/prisma/store/tenants";

import { middleware } from "../trpc";

/**
 * Middleware that selects the appropriate Prisma client based on the request host.
 * This middleware should be used in all tRPC procedures to ensure proper tenant selection.
 *
 */
const prismaMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.req) return next();
  const host = ctx.req.headers.host || "";
  const tenant = getTenantFromHost(host);
  return runWithTenants(tenant, async () => {
    const prisma = getPrisma(tenant);
    return next({
      ctx: {
        ...ctx,
        prisma,
      },
    });
  });
});

export default prismaMiddleware;
