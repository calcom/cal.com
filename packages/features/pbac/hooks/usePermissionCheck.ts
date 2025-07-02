import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import type { PermissionString } from "../domain/types/permission-registry";

export function usePermissionCheck({
  teamId,
  permission,
  fallbackRoles,
}: {
  teamId: number;
  permission: PermissionString;
  fallbackRoles?: MembershipRole[];
}) {
  return trpc.viewer.pbac.checkPermission.useQuery({
    teamId,
    permission,
    fallbackRoles,
  });
}
