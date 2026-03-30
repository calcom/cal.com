import { emitAuditEvent } from "@calcom/features/audit/di/AuditProducerService.container";
import { AuditActions } from "@calcom/features/audit/types/auditAction";
import { AuditSources } from "@calcom/features/audit/types/auditSource";
import { AuditTargets } from "@calcom/features/audit/types/auditTarget";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "uuid" | "organizationId">;
    sourceIp?: string;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  const apiKeyToDelete = await prisma.apiKey.findUnique({
    where: { id },
  });

  await prisma.user.update({
    where: { id: ctx.user.id },
    data: {
      apiKeys: {
        delete: { id },
      },
    },
  });

  // Remove all existing zapier webhooks, as we always have only one zapier API key
  // and the running zaps won't work any more if this key is deleted
  if (apiKeyToDelete?.appId === "zapier") {
    await prisma.webhook.deleteMany({
      where: { userId: ctx.user.id, appId: "zapier" },
    });
  }

  void emitAuditEvent({
    actor: { userUuid: ctx.user.uuid },
    action: AuditActions.API_KEY_REVOKED,
    source: AuditSources.WEBAPP,
    targetType: AuditTargets.apiKey,
    targetId: id,
    orgId: ctx.user.organizationId ?? null,
    ip: ctx.sourceIp,
  });

  return { id };
};
