import { handleAuditLogTrigger } from "@calcom/features/audit-logs/lib/handleAuditLogTrigger";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { experimental_trpcMiddleware } from "@trpc/server";

export const auditLogMiddleware = experimental_trpcMiddleware<{
  ctx: { user: NonNullable<TrpcSessionUser>; sourceIp: string | undefined; data: any }; // defaults to 'object' if not defined
}>().create(async (opts) => {
  const result = await opts.next();

  await handleAuditLogTrigger({
    path: opts.path,
    user: opts.ctx.user,
    sourceIp: opts.ctx.sourceIp,
    data: result.data,
  });

  return result;
});
