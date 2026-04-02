import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { addPermissionsToWorkflows } from "@calcom/features/workflows/repositories/WorkflowPermissionsRepository";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";
import { getEventTypeWorkflows } from "./util";

type GetAllActiveWorkflowsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllActiveWorkflowsInputSchema;
};

export const getAllActiveWorkflowsHandler = async ({ input, ctx }: GetAllActiveWorkflowsOptions) => {
  const { eventType } = input;
  const workflows = await getEventTypeWorkflows(ctx.user.id, eventType.id);
  const completeEventType = {
    workflows,
    teamId: eventType.teamId,
    userId: eventType.userId,
    parent: eventType.parent,
    metadata: eventType.metadata,
  };

  if (
    eventType.userId &&
    eventType.userId !== ctx.user.id &&
    !eventType.teamId &&
    !eventType.parent?.teamId
  ) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const permissionCheckService = new PermissionCheckService();

  if (eventType.teamId) {
    const hasPermissionToViewWorkflows = await permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: eventType.teamId,
      permission: "workflow.read",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasPermissionToViewWorkflows) throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const allActiveWorkflows = await getAllWorkflowsFromEventType(
    {
      ...completeEventType,
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
    },
    eventType.userId
  );

  const workflowsWithPermissions = await addPermissionsToWorkflows(allActiveWorkflows, ctx.user.id);

  const filteredWorkflows = workflowsWithPermissions.filter((workflow) => workflow.permissions.canView);

  return filteredWorkflows;
};
