import { emitAuditEvent } from "@calcom/features/audit/di/AuditProducerService.container";
import { AuditActions } from "@calcom/features/audit/types/auditAction";
import { AuditSources } from "@calcom/features/audit/types/auditSource";
import { AuditTargets } from "@calcom/features/audit/types/auditTarget";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

import { TRPCError } from "@trpc/server";

import type { TRemoveMemberInputSchema } from "./removeMember.schema";
import { RemoveMemberServiceFactory } from "./removeMember/RemoveMemberServiceFactory";

type RemoveMemberOptions = {
  ctx: {
    user: {
      id: number;
      uuid: string;
      organizationId: number | null;
      organization?: {
        id: number | null;
        isOrgAdmin: boolean;
      };
    };
    sourceIp?: string;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({
  ctx,
  input,
}: RemoveMemberOptions): Promise<void> => {
  const { id: userId, organizationId, organization } = ctx.user;
  await checkRateLimitAndThrowError({
    identifier: `removeMember.${userId}`,
  });

  const { memberIds, teamIds, isOrg } = input;
  const isOrgAdmin = organization?.isOrgAdmin ?? false;
  const userOrgId = organizationId ?? organization?.id ?? null;

  // Note: This assumes that all teams in the request have the same PBAC setting 9999% chance they do.
  const primaryTeamId = teamIds[0];
  if (!primaryTeamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one team ID must be provided",
    });
  }

  // Get the appropriate service based on feature flag
  const service = await RemoveMemberServiceFactory.create(primaryTeamId);

  const { hasPermission } = await service.checkRemovePermissions({
    userId,
    isOrgAdmin,
    organizationId: userOrgId,
    memberIds,
    teamIds,
    isOrg,
  });

  if (!hasPermission) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  await service.validateRemoval(
    {
      userId,
      isOrgAdmin,
      organizationId: userOrgId,
      memberIds,
      teamIds,
      isOrg,
    },
    hasPermission
  );

  // Perform the removal
  await service.removeMembers(memberIds, teamIds, isOrg);

  const operationId = crypto.randomUUID();
  for (const teamId of teamIds) {
    for (const memberId of memberIds) {
      void emitAuditEvent({
        actor: { userUuid: ctx.user.uuid },
        action: AuditActions.MEMBER_REMOVED,
        source: AuditSources.WEBAPP,
        targetType: AuditTargets.team,
        targetId: String(teamId),
        newValue: String(memberId),
        orgId: organizationId ?? null,
        ip: ctx.sourceIp,
        operationId,
      });
    }
  }
};

export default removeMemberHandler;
