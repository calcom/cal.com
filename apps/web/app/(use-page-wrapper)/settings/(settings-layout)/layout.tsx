import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { TeamFeatures } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { PermissionContext } from "../_lib/tabs/types";
import type { SettingsLayoutProps } from "./SettingsLayoutAppDirClient";
import SettingsLayoutAppDirClientNew from "./SettingsLayoutAppDirClient";

// Cache team features
const getTeamFeatures = unstable_cache(
  async (teamId: number) => {
    const featuresRepository = new FeaturesRepository(prisma);
    return await featuresRepository.getTeamFeatures(teamId);
  },
  ["team-features"],
  {
    revalidate: 120,
  }
);

// Cache resource permissions
const getCachedResourcePermissions = unstable_cache(
  async (userId: number, teamId: number, resource: Resource) => {
    const permissionService = new PermissionCheckService();
    return permissionService.getResourcePermissions({ userId, teamId, resource });
  },
  ["resource-permissions"],
  { revalidate: 120 }
);

// Get user data with teams
const getUserWithTeams = unstable_cache(
  async (userId: number) => {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                parentId: true,
              },
            },
          },
        },
        profiles: {
          select: {
            organizationId: true,
          },
        },
      },
    });
  },
  ["user-with-teams"],
  { revalidate: 60 }
);

// Get organization data
const getOrganization = unstable_cache(
  async (orgId: number) => {
    return prisma.team.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
      },
    });
  },
  ["organization"],
  { revalidate: 120 }
);

export default async function SettingsLayoutAppDirNew(props: SettingsLayoutProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;

  if (!userId) {
    return redirect("/auth/login");
  }

  // Fetch user data with teams
  const userData = await getUserWithTeams(userId);
  if (!userData) {
    return redirect("/auth/login");
  }

  const orgId = userData.profiles?.[0]?.organizationId ?? session?.user.org?.id;

  // Build permission context
  const permissionContext: PermissionContext = {
    userId,
    isAdmin: session.user.role === UserPermissionRole.ADMIN,
    isOrgAdmin: false,
    isOrgOwner: false,
    organizationId: orgId,
    organizationSlug: undefined,
    teamMemberships: userData.teams.map((membership) => ({
      id: membership.team.id,
      role: membership.role,
      parentId: membership.team.parentId,
      accepted: membership.accepted,
    })),
    features: {},
    resourcePermissions: {},
    identityProvider: userData.identityProvider || undefined,
    twoFactorEnabled: userData.twoFactorEnabled || false,
    passwordAdded: !!userData.password,
  };

  // Declare orgData in outer scope
  let orgData = null;

  // Fetch organization-specific data if user belongs to an org
  if (orgId) {
    const [orgDataResult, orgFeatures] = await Promise.all([getOrganization(orgId), getTeamFeatures(orgId)]);
    orgData = orgDataResult;

    if (orgData) {
      permissionContext.organizationSlug = orgData.slug || undefined;

      // Check org admin/owner status
      const orgMembership = userData.teams.find((m) => m.team.id === orgId);
      if (orgMembership) {
        permissionContext.isOrgAdmin = checkAdminOrOwner(orgMembership.role);
        permissionContext.isOrgOwner = orgMembership.role === "OWNER";
      }
    }

    // Add organization features
    if (orgFeatures) {
      Object.entries(orgFeatures).forEach(([key, value]) => {
        permissionContext.features[key] = value;
      });
    }

    // Fetch PBAC permissions for relevant resources
    const resourcesToCheck = [Resource.Role, Resource.Membership, Resource.EventType, Resource.Availability];

    const resourcePerms = await Promise.all(
      resourcesToCheck.map(async (resource) => {
        const perms = await getCachedResourcePermissions(userId, orgId, resource);
        const actionMap = PermissionMapper.toActionMap(perms, resource);
        return { resource, actionMap };
      })
    );

    // Add resource permissions to context
    resourcePerms.forEach(({ resource, actionMap }) => {
      permissionContext.resourcePermissions[resource] = actionMap;
    });
  }

  // Fetch features for all teams (for sub-team PBAC checks)
  const teamFeatures: Record<number, TeamFeatures> = {};
  if (userData.teams.length > 0) {
    const teamFeaturePromises = userData.teams.map(async (membership) => {
      const features = await getTeamFeatures(membership.team.id);
      if (features) {
        teamFeatures[membership.team.id] = features;
        // Add team-specific features to context with team prefix
        Object.entries(features).forEach(([key, value]) => {
          permissionContext.features[`${key}_${membership.team.id}`] = value;
        });
      }
    });
    await Promise.all(teamFeaturePromises);
  }

  // Fetch other teams for org admins
  let otherTeams = null;
  if (orgId && (permissionContext.isOrgAdmin || permissionContext.isOrgOwner)) {
    const org = await prisma.team.findUnique({
      where: { id: orgId },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            parentId: true,
          },
        },
      },
    });
    otherTeams = org?.children || [];
  }

  return (
    <SettingsLayoutAppDirClientNew
      {...props}
      permissionContext={permissionContext}
      teams={userData.teams.map((m) => ({
        ...m.team,
        role: m.role,
        accepted: m.accepted,
        isOrgAdmin: m.team.id === orgId && permissionContext.isOrgAdmin,
      }))}
      otherTeams={otherTeams}
      user={{
        id: userData.id,
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar,
      }}
      organization={
        orgId && permissionContext.organizationSlug
          ? {
              id: orgId,
              name: orgData?.name || "Organization",
              slug: permissionContext.organizationSlug,
              logoUrl: orgData?.logoUrl || null,
            }
          : null
      }
    />
  );
}
