import { handleAuditLogTrigger } from "@calcom/features/audit-logs/lib/handleAuditLogTrigger";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { experimental_trpcMiddleware } from "@trpc/server";

export const auditLogMiddleware = experimental_trpcMiddleware<{
  ctx: { user: NonNullable<TrpcSessionUser>; sourceIp: string | undefined; data: any };
}>().create(async (opts) => {
  const result = await opts.next();

  await handleAuditLogTrigger({
    trigger: result.data.data.trigger,
    user: opts.ctx.user,
    sourceIp: opts.ctx.sourceIp,
    data: result.data.data,
  });

  delete result.data.data;

  return {
    ...result,
  };
});
