import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { TeamFeatures } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { Resource, CrudAction, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { SettingsLayoutProps } from "./SettingsLayoutAppDirClient";
import SettingsLayoutAppDirClient from "./SettingsLayoutAppDirClient";

const getTeamFeatures = unstable_cache(
  async (teamId: number) => {
    const featuresRepository = new FeaturesRepository(prisma);
    return await featuresRepository.getEnabledTeamFeatures(teamId);
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
  let canViewOrganizationBilling = false;
  let canUpdateOrganization = false;
  let canViewAttributes = false;
  const orgId = session?.user?.profile?.organizationId ?? session?.user.org?.id;

  // For now we only grab organization features but it would be nice to fetch these on the server side for specific team feature flags
  if (orgId) {
    const isOrgAdminOrOwner = checkAdminOrOwner(session.user.org?.role);
    const features = await getTeamFeatures(orgId);

    if (features) {
      teamFeatures = {
        [orgId]: features,
      };
    }

    // Check if PBAC feature is enabled
    const isPbacEnabled = features?.pbac === true;

    if (isPbacEnabled) {
      // Only fetch and apply PBAC permissions if the feature is enabled
      const [rolePermissions, organizationPermissions, attributesPermissions] = await Promise.all([
        getCachedResourcePermissions(userId, orgId, Resource.Role),
        getCachedResourcePermissions(userId, orgId, Resource.Organization),
        getCachedResourcePermissions(userId, orgId, Resource.Attributes),
      ]);

      // Check if user has permission to read roles
      const roleActions = PermissionMapper.toActionMap(rolePermissions, Resource.Role);
      canViewRoles = roleActions[CrudAction.Read] ?? false;
      const orgActions = PermissionMapper.toActionMap(organizationPermissions, Resource.Organization);
      canViewOrganizationBilling = orgActions[CustomAction.ManageBilling] ?? isOrgAdminOrOwner;
      canUpdateOrganization = orgActions[CrudAction.Update] ?? isOrgAdminOrOwner;
      const attributesActions = PermissionMapper.toActionMap(attributesPermissions, Resource.Attributes);
      canViewAttributes = attributesActions[CrudAction.Read] ?? isOrgAdminOrOwner;
    } else {
      // Fall back to legacy permissions when PBAC is not enabled or features not loaded
      canViewRoles = features ? isOrgAdminOrOwner : false;
      canViewOrganizationBilling = isOrgAdminOrOwner;
      canUpdateOrganization = isOrgAdminOrOwner;
      canViewAttributes = isOrgAdminOrOwner;
    }
  }

  return (
    <>
      <SettingsLayoutAppDirClient
        {...props}
        teamFeatures={teamFeatures ?? {}}
        permissions={{ canViewRoles, canViewOrganizationBilling, canUpdateOrganization, canViewAttributes }}
      />
    </>
  );
}
