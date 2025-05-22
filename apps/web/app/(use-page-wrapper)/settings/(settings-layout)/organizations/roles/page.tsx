import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
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
    console.log(res);
    return res;
  },
  ["team-feature"],
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

  if (!session?.user.org?.id) {
    return notFound();
  }

  const teamHasPBACFeature = await getCachedTeamFeature(session.user.org.id, "pbac");

  if (!teamHasPBACFeature) {
    return notFound();
  }

  const roles = await getCachedTeamRoles(session.user.org.id);

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
