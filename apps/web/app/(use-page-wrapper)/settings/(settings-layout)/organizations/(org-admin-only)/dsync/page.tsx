import { _generateMetadata, getTranslate } from "app/_utils";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import DirectorySyncTeamView from "@calcom/features/ee/dsync/page/team-dsync-view";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("directory_sync"),
    (t) => t("directory_sync_description"),
    undefined,
    undefined,
    "/settings/organizations/dsync"
  );

const Page = async () => {
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user.id || !session?.user.profile?.organizationId || !session?.user.org) {
    return redirect("/settings/organizations/general");
  }

  const { canEdit } = await getResourcePermissions({
    userId: session.user.id,
    teamId: session.user.profile.organizationId,
    resource: Resource.Organization,
    userRole: session.user.org.role,
    fallbackRoles: {
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  return (
    <SettingsHeader title={t("directory_sync")} description={t("directory_sync_description")}>
      <DirectorySyncTeamView permissions={{ canEdit }} />
    </SettingsHeader>
  );
};

export default Page;
