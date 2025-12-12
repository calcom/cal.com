import { _generateMetadata, getTranslate } from "app/_utils";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import TeamFeaturesView from "~/settings/teams/team-features-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("team_features_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/features`
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const t = await getTranslate();
  const { id } = await params;
  const teamId = parseInt(id, 10);

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;

  if (!userId) {
    return redirect(`/auth/login?callbackUrl=/settings/teams/${id}/features`);
  }

  const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({
    userId,
    teamId,
  });

  if (!membership) {
    return redirect("/settings/teams");
  }

  const { canRead, canEdit } = await getResourcePermissions({
    userId,
    teamId,
    resource: Resource.Feature,
    userRole: membership.role,
    fallbackRoles: {
      read: {
        roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canRead) {
    return (
      <SettingsHeader
        title={t("features")}
        description={t("team_features_description")}
        borderInShellHeader={true}>
        <div className="border-subtle rounded-b-xl border-x border-b px-4 py-8 sm:px-6">
          <p className="text-subtle text-sm">{t("no_permission_to_view")}</p>
        </div>
      </SettingsHeader>
    );
  }

  return <TeamFeaturesView canEdit={canEdit} />;
};

export default Page;
