import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import authedProcedure from "../../../procedures/authedProcedure";

/**
 * Creates an attribute procedure with configurable PBAC permissions for organization-scoped operations
 * @param permission - The specific permission required (e.g., "organization.attributes.editUsers", "organization.attributes.create")
 * @param fallbackRoles - Roles to check when PBAC is disabled (defaults to ["ADMIN", "OWNER"])
 * @returns A procedure that checks the specified permission
 */
export const createAttributePbacProcedure = (
  permission: PermissionString,
  fallbackRoles: MembershipRole[] = ["ADMIN", "OWNER"]
) => {
  return authedProcedure.use(async ({ ctx, next }) => {
    const org = ctx.user.organization;

    if (!org?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You need to be part of an organization to use this feature",
      });
    }

    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: org.id,
      permission,
      fallbackRoles,
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission required: ${permission}`,
      });
    }

    return next();
  });
};
