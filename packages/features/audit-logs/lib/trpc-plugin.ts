import type { UserFromSession } from "@calcom/trpc/server/middlewares/sessionMiddleware";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { experimental_trpcMiddleware } from "@trpc/server";

export const auditLogMiddleware = experimental_trpcMiddleware<{
  ctx: { user: NonNullable<TrpcSessionUser> }; // defaults to 'object' if not defined
}>().create(async (opts) => {
  const { user }: { user: UserFromSession } = opts.ctx;

  // await handleAuditLogTrigger({
  //   event: {
  //     action: AuditLogTriggerEvents[opts.path as keyof typeof AuditLogTriggerEvents],
  //     actor: {
  //       id: user.id,
  //     },
  //     target: {
  //       name: AuditLogTriggerTargets.APPS,
  //     },
  //   },
  //   userId: user.id,
  // });

  return opts.next({ ctx: { user: user } });
});
