import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { MembershipRole } from "@calcom/prisma/enums";
import { redirect } from "next/navigation";
import { validateUserHasOrg } from "./validateUserHasOrg";

export const validateUserHasOrgPerms = async ({
  redirectTo,
  fallbackRoles,
  permission,
}: {
  redirectTo?: string;
  permission: PermissionString;
  fallbackRoles: MembershipRole[];
}) => {
  const session = await validateUserHasOrg();

  const permissionCheckService = new PermissionCheckService();

  const hasPermission = await permissionCheckService.checkPermission({
    userId: session.user.id,
    teamId: session.user.org.id,
    permission,
    fallbackRoles,
  });

  if (!hasPermission) {
    redirect(redirectTo || "/settings/my-account/profile");
  }

  return session;
};
