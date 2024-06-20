import { z } from "zod";

import { handleAuditLogTrigger } from "@calcom/features/audit-logs/lib/handleAuditLogTrigger";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { experimental_trpcMiddleware } from "@trpc/server";

import type { AuditLogTriggerEvents } from "../types";

const ZResult = z.object({
  result: z.any(),
  auditLogData: z
    .object({
      trigger: z.string(),
    })
    .passthrough(),
});

export const auditLogMiddleware = experimental_trpcMiddleware<{
  ctx: { user: NonNullable<TrpcSessionUser>; sourceIp: string | undefined };
}>().create(async (opts) => {
  const result = await opts.next();

  if (result.ok && result.data) {
    const parsedResult = ZResult.safeParse(result.data);

    if (parsedResult.success) {
      await handleAuditLogTrigger({
        trigger: parsedResult.data.auditLogData.trigger as AuditLogTriggerEvents,
        user: { name: opts.ctx.user.name ?? "Name undefined", id: opts.ctx.user.id },
        source_ip: opts.ctx.sourceIp,
        data: parsedResult.data.auditLogData,
      });

      result.data = parsedResult.data.result;
    }
  }

  return result;
});
