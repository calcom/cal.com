import { withDbContext } from "@calcom/prisma";

import { middleware } from "../trpc";

const REPLICA_HEADER = "x-cal-replica";

export const dbContextMiddleware = middleware(({ ctx, next }) => {
  const replica = ctx.req?.headers?.[REPLICA_HEADER] as string | undefined;
  if (!replica) return next();
  return withDbContext({ replica }, () => next());
});
