import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { Resource, CrudAction, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { RoleService } from "@calcom/features/pbac/services/role.service";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { CreateRoleCTA } from "./_components/CreateRoleCta";
import { RolesList } from "./_components/RolesList";
import { SkeletonLoader } from "./_components/RolesSkeletonLoader";

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
    const featureRepo = new FeaturesRepository();
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

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("roles_and_permissions"),
    (t) => t("roles_and_permissions_description"),
    undefined,
    undefined,
    "/settings/organizations/roles"
  );

const Page = async () => {
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.org?.id || !session.user.id) {
    return notFound();
  }

  const teamHasPBACFeature = await getCachedTeamFeature(session.user.org.id, "pbac");

  if (!teamHasPBACFeature) {
    return notFound();
  }

  const [roles, rolePermissions] = await Promise.all([
    getCachedTeamRoles(session.user.org.id),
    getCachedResourcePermissions(session.user.id, session.user.org.id, Resource.Role),
  ]);

  const hasRolePermissions = rolePermissions.some((permission) =>
    [
      `${Resource.Role}.${CrudAction.Create}`,
      `${Resource.Role}.${CrudAction.Read}`,
      `${Resource.Role}.${CrudAction.Update}`,
      `${Resource.Role}.${CrudAction.Delete}`,
      `${Resource.Role}.${CustomAction.Manage}`,
    ].includes(permission)
  );

  if (!hasRolePermissions) {
    return notFound();
  }

  return (
    <SettingsHeader
      title={t("roles_and_permissions")}
      description={t("roles_and_permissions_description")}
      borderInShellHeader={false}
      CTA={<CreateRoleCTA />}>
      <Suspense fallback={<SkeletonLoader />}>
        <RolesList roles={roles} />
      </Suspense>
    </SettingsHeader>
  );
};

export default Page;
