import { v4 } from "uuid";

import { generateUniqueAPIKey } from "@calcom/ee/api-keys/lib/apiKeys";
import { emitAuditEvent } from "@calcom/features/audit/di/AuditProducerService.container";
import { AuditActions } from "@calcom/features/audit/types/auditAction";
import { AuditSources } from "@calcom/features/audit/types/auditSource";
import { AuditTargets } from "@calcom/features/audit/types/auditTarget";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import { checkPermissions } from "./_auth-middleware";
import type { TCreateInputSchema } from "./create.schema";

type CreateHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "uuid" | "organizationId">;
    sourceIp?: string;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateHandlerOptions) => {
  const [hashedApiKey, apiKey] = generateUniqueAPIKey();

  // Here we snap never expires before deleting it so it's not passed to prisma create call.
  const { neverExpires, teamId, ...rest } = input;
  const userId = ctx.user.id;

  /** Only admin or owner can create apiKeys of team (if teamId is passed) */
  await checkPermissions({ userId, teamId, role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] } });

  const apiKeyId = v4();

  await prisma.apiKey.create({
    data: {
      id: apiKeyId,
      userId: ctx.user.id,
      teamId,
      ...rest,
      // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
      expiresAt: neverExpires ? null : rest.expiresAt,
      hashedKey: hashedApiKey,
    },
  });

  void emitAuditEvent({
    actor: { userUuid: ctx.user.uuid },
    action: AuditActions.API_KEY_CREATED,
    source: AuditSources.WEBAPP,
    targetType: AuditTargets.apiKey,
    targetId: apiKeyId,
    orgId: ctx.user.organizationId ?? null,
    ip: ctx.sourceIp,
  });

  const apiKeyPrefix = process.env.API_KEY_PREFIX ?? "cal_";

  const prefixedApiKey = `${apiKeyPrefix}${apiKey}`;

  return prefixedApiKey;
};
