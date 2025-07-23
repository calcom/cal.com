import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { TeamFeatures } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { Resource, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { SettingsLayoutProps } from "./SettingsLayoutAppDirClient";
import SettingsLayoutAppDirClient from "./SettingsLayoutAppDirClient";

const getTeamFeatures = unstable_cache(
  async (teamId: number) => {
    const featuresRepository = new FeaturesRepository();
    return await featuresRepository.getTeamFeatures(teamId);
  },
  ["team-features"],
  {
    revalidate: 120,
  }
);

const getCachedResourcePermissions = unstable_cache(
  async (userId: number, teamId: number, resource: Resource) => {
    const permissionService = new PermissionCheckService();
    return permissionService.getResourcePermissions({ userId, teamId, resource });
  },
  ["resource-permissions"],
  { revalidate: 120 }
);

export default async function SettingsLayoutAppDir(props: SettingsLayoutProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) {
    return redirect("/auth/login");
  }

  let teamFeatures: Record<number, TeamFeatures> | null = null;
  let canViewRoles = false;
  const orgId = session?.user?.profile?.organizationId ?? session?.user.org?.id;

  // For now we only grab organization features but it would be nice to fetch these on the server side for specific team feature flags
  if (orgId) {
    const [features, rolePermissions] = await Promise.all([
      getTeamFeatures(orgId),
      getCachedResourcePermissions(userId, orgId, Resource.Role),
    ]);

    if (features) {
      teamFeatures = {
        [orgId]: features,
      };

      // Check if user has permission to read roles
      const roleActions = PermissionMapper.toActionMap(rolePermissions, Resource.Role);
      canViewRoles = roleActions[CrudAction.Read] ?? false;
    }
  }

  return (
    <>
      <SettingsLayoutAppDirClient {...props} teamFeatures={teamFeatures ?? {}} canViewRoles={canViewRoles} />
    </>
  );
}
