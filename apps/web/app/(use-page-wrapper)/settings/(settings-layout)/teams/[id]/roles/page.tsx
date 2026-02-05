import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getTeamWithMembers } from "@calcom/features/ee/teams/lib/queries";
import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { Resource, CrudAction, Scope } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { RoleService } from "@calcom/features/pbac/services/role.service";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { prisma } from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { CreateRoleCTA } from "../../../organizations/roles/_components/CreateRoleCta";
import { RolesList } from "../../../organizations/roles/_components/RolesList";
import { roleSearchParamsCache } from "../../../organizations/roles/_components/searchParams";

const getCachedTeamRoles = (teamId: number) =>
  unstable_cache(
    async () => {
      const roleService = new RoleService();
      return roleService.getTeamRoles(teamId);
    },
    [`team-roles-for-team-${teamId}`],
    { revalidate: 3600, tags: [`team-roles-${teamId}`] }
  );

const getCachedTeamFeature = (teamId: number, feature: keyof AppFlags) =>
  unstable_cache(
    async () => {
      const featureRepo = new FeaturesRepository(prisma);
      const res = await featureRepo.checkIfTeamHasFeature(teamId, feature);
      return res;
    },
    [`team-feature-for-roles-${teamId}-${feature}`],
    { revalidate: 3600, tags: [`team-features-${teamId}`] }
  );

const getCachedResourcePermissions = (userId: number, teamId: number, resource: Resource) =>
  unstable_cache(
    async () => {
      const permissionService = new PermissionCheckService();
      return permissionService.getResourcePermissions({ userId, teamId, resource });
    },
    [`resource-permissions-for-team-roles-${userId}-${teamId}-${resource}`],
    { revalidate: 3600, tags: [`resource-permissions-${teamId}`] }
  );

const getCachedTeamPrivacy = (teamId: number) =>
  unstable_cache(
    async () => {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { isPrivate: true },
      });
      return team?.isPrivate ?? false;
    },
    [`team-privacy-${teamId}`],
    { revalidate: 3600, tags: [`team-privacy-${teamId}`] }
  );

const getCachedTeam = (teamId: string, userId: number) =>
  unstable_cache(
    async () => {
      return getTeamWithMembers({
        id: Number(teamId),
        userId: userId,
        isTeamView: true,
      });
    },
    [`team-with-members-for-roles-${teamId}-${userId}`],
    { revalidate: 3600, tags: [`team-members-${teamId}`] }
  );

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return await _generateMetadata(
    (t) => t("roles_and_permissions"),
    (t) => t("roles_and_permissions_description"),
    undefined,
    undefined,
    `/settings/teams/${id}/roles`
  );
};

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Record<string, string | string[] | undefined>;
}) => {
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const { id: teamId } = await params;

  if (!session?.user?.id) {
    return notFound();
  }

  // Get team information including parent
  const team = await getCachedTeam(teamId, session.user.id)();

  if (!team) {
    return notFound();
  }

  // Check if team has a parent (is a sub-team)
  if (!team.parent?.id) {
    return notFound();
  }

  // Check if parent team has PBAC feature enabled
  const parentTeamHasPBACFeature = await getCachedTeamFeature(team.parent.id, "pbac")();

  if (!parentTeamHasPBACFeature) {
    return notFound();
  }

  roleSearchParamsCache.parse(searchParams);

  const [roles, rolePermissions, isPrivate] = await Promise.all([
    getCachedTeamRoles(team.id)(),
    getCachedResourcePermissions(session.user.id, team.id, Resource.Role)(),
    getCachedTeamPrivacy(team.id)(),
  ]);

  // NOTE: this approach of fetching permssions per resource does not account for fall back roles.
  const roleActions = PermissionMapper.toActionMap(rolePermissions, Resource.Role);

  const canCreate = roleActions[CrudAction.Create] ?? false;
  const canRead = roleActions[CrudAction.Read] ?? false;
  const canUpdate = roleActions[CrudAction.Update] ?? false;
  const canDelete = roleActions[CrudAction.Delete] ?? false;

  if (!canRead) {
    return notFound();
  }

  // Get sheet state from server cache
  const isSheetOpen = roleSearchParamsCache.get("role-sheet");
  const selectedRoleId = roleSearchParamsCache.get("role");
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  // Use Team scope for team roles (this will automatically filter appropriate resources)

  return (
    <SettingsHeader
      title={t("roles_and_permissions")}
      description={t("roles_and_permissions_description")}
      borderInShellHeader={false}
      CTA={canCreate ? <CreateRoleCTA /> : null}>
      <RolesList
        teamId={team.id}
        roles={roles}
        permissions={{
          canCreate: canCreate,
          canRead: canRead,
          canUpdate: canUpdate,
          canDelete: canDelete,
        }}
        initialSelectedRole={selectedRole}
        initialSheetOpen={isSheetOpen}
        scope={Scope.Team}
        isPrivate={isPrivate}
      />
    </SettingsHeader>
  );
};

export default Page;
