import { getPrismaFromHost, runWithTenants } from "@calcom/prisma/store/prismaStore";

import { middleware } from "../trpc";

const prismaMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.req) {
    return next();
  }

  const host = ctx.req.headers.host || "";

  return runWithTenants(async () => {
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
