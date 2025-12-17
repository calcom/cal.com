import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { PrismaRoutingFormRepository } from "@calcom/features/routing-forms/repositories/PrismaRoutingFormRepository";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

export async function checkPermissionOnExistingRoutingForm({
  formId,
  userId,
  permission,
  fallbackRoles,
}: {
  formId: string;
  userId: number;
  permission: PermissionString;
  fallbackRoles: MembershipRole[];
}) {
  // First get the form to check its team context
  const form = await PrismaRoutingFormRepository.findById(formId, {
    select: { teamId: true, userId: true },
  });

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found",
    });
  }

  // Check PBAC permissions for personal-scoped routing forms only
  if (!form.teamId && form.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to this personal-scoped routing form",
    });
  }

  // Check PBAC permissions for team-scoped routing forms only
  if (form.teamId) {
    const permissionService = new PermissionCheckService();
    const hasPermission = await permissionService.checkPermission({
      userId: userId,
      teamId: form.teamId,
      permission,
      fallbackRoles,
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You don't have "${permission}" permission for this routing form`,
      });
    }
  }
}
