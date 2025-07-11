import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LegacyPage from "@calcom/features/ee/organizations/pages/settings/profile";
import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { CrudAction, Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_org_description"),
    undefined,
    undefined,
    "/settings/organizations/profile"
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

const AdminOrOwnerRoles: MembershipRole[] = ["ADMIN", "OWNER"];

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const t = await getTranslate();

  if (!session?.user.id || !session?.user.profile?.organizationId || !session?.user.org) {
    return redirect("/settings/profile");
  }

  const adminOrOwner = AdminOrOwnerRoles.includes(session.user.org?.role);

  let canEdit = adminOrOwner;
  let canRead = adminOrOwner;
  let canDelete = session.user.org.role === MembershipRole.OWNER;

  const pbacEnabled = await getCachedTeamFeature(session.user.profile.organizationId, "pbac");

  if (pbacEnabled) {
    const resourcePermissionsForUser = await getCachedResourcePermissions(
      session.user.id,
      session.user.profile.organizationId,
      Resource.Organization
    );

    const roleActions = PermissionMapper.toActionMap(resourcePermissionsForUser, Resource.Organization);

    canRead = roleActions[CrudAction.Read] ?? false;
    canEdit = roleActions[CrudAction.Update] ?? false;
    canDelete = roleActions[CrudAction.Delete] ?? false;
  }

  return (
    <SettingsHeader
      title={t("profile")}
      description={t("profile_org_description")}
      borderInShellHeader={true}>
      <LegacyPage
        permissions={{
          canEdit,
          canRead,
          canDelete,
        }}
      />
    </SettingsHeader>
  );
};

export default Page;
