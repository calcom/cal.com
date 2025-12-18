import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { Workflow } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

export async function isAuthorized(
  workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null,
  currentUserId: number,
  permission: PermissionString = "workflow.read"
) {
  if (!workflow) {
    return false;
  }

  // For personal workflows (no teamId), check if user owns the workflow
  if (!workflow.teamId) {
    return workflow.userId === currentUserId;
  }

  // For team workflows, use PBAC
  const permissionService = new PermissionCheckService();

  // Determine fallback roles based on permission type
  const fallbackRoles =
    permission === "workflow.read"
      ? [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER]
      : [MembershipRole.ADMIN, MembershipRole.OWNER];

  return await permissionService.checkPermission({
    userId: currentUserId,
    teamId: workflow.teamId,
    permission,
    fallbackRoles,
  });
}
