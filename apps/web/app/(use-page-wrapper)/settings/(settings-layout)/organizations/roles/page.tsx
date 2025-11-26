import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { Resource, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { RoleService } from "@calcom/features/pbac/services/role.service";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { prisma } from "@calcom/prisma";

import { validateUserHasOrg } from "../actions/validateUserHasOrg";
import { CreateRoleCTA } from "./_components/CreateRoleCta";
import { PbacOptInView } from "./_components/PbacOptInView";
import { RolesList } from "./_components/RolesList";
import { roleSearchParamsCache } from "./_components/searchParams";

const getCachedTeamRoles = unstable_cache(
  async (teamId: number) => {
    const roleService = new RoleService();
    return roleService.getTeamRoles(teamId);
  },
  ["team-roles"],
  { revalidate: 3600 }
);

const getCachedTeamFeature = unstable_cache(
  async (teamId: number, feature: keyof AppFlags) => {
    const featureRepo = new FeaturesRepository(prisma);
    const res = await featureRepo.checkIfTeamHasFeature(teamId, feature);
    return res;
  },
  ["team-feature"],
  { revalidate: 3600 }
);

const getCachedResourcePermissions = unstable_cache(
  async (userId: number, teamId: number, resource: Resource) => {
    const permissionService = new PermissionCheckService();
    return permissionService.getResourcePermissions({ userId, teamId, resource });
  },
  ["resource-permissions"],
  { revalidate: 3600 }
);

const getCachedTeamPrivacy = unstable_cache(
  async (teamId: number) => {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { isPrivate: true },
    });
    return team?.isPrivate ?? false;
  },
  ["team-privacy"],
  { revalidate: 3600 }
);

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("roles_and_permissions"),
    (t) => t("roles_and_permissions_description"),
    undefined,
    undefined,
    "/settings/organizations/roles"
  );

async function revalidateRolesPath() {
  "use server";
  revalidatePath("/settings/organizations/roles");
}

const Page = async ({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) => {
  const t = await getTranslate();
  const session = await validateUserHasOrg();

  if (!session?.user?.org?.id || !session.user.id) {
    return notFound();
  }

  const teamHasPBACFeature = await getCachedTeamFeature(session.user.org.id, "pbac");

  if (!teamHasPBACFeature) {
    // Get system roles for preview
    const roleService = new RoleService();
    const systemRoles = (await roleService.getTeamRoles(session.user.org.id)).filter(
      (role) => role.type === "SYSTEM"
    );
    return (
      <PbacOptInView
        revalidateRolesPath={revalidateRolesPath}
        systemRoles={systemRoles}
        teamId={session.user.org.id}
      />
    );
  }

  roleSearchParamsCache.parse(searchParams);

  const [roles, rolePermissions, isPrivate] = await Promise.all([
    getCachedTeamRoles(session.user.org.id),
    getCachedResourcePermissions(session.user.id, session.user.org.id, Resource.Role),
    getCachedTeamPrivacy(session.user.org.id),
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

  return (
    <SettingsHeader
      title={t("roles_and_permissions")}
      description={t("roles_and_permissions_description")}
      borderInShellHeader={false}
      CTA={canCreate ? <CreateRoleCTA /> : null}>
      <RolesList
        teamId={session.user.org.id}
        roles={roles}
        permissions={{
          canCreate: canCreate,
          canRead: canRead,
          canUpdate: canUpdate,
          canDelete: canDelete,
        }}
        initialSelectedRole={selectedRole}
        initialSheetOpen={isSheetOpen}
        isPrivate={isPrivate}
      />
    </SettingsHeader>
  );
};

export default Page;
