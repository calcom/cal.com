import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LegacyPage from "@calcom/features/ee/organizations/pages/settings/profile";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import type { Membership } from "@calcom/prisma/client";
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

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const t = await getTranslate();

  const orgRole = session?.user.profile?.organization.members?.find(
    (member: Membership) => member.userId === session?.user.id
  )?.role;

  if (!session?.user.id || !session?.user.profile?.organizationId || !orgRole) {
    return redirect("/settings/profile");
  }

  const { canRead, canEdit, canDelete } = await getResourcePermissions({
    userId: session.user.id,
    teamId: session?.user.profile?.organizationId,
    resource: Resource.Organization,
    userRole: orgRole,
    fallbackRoles: {
      read: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      delete: {
        roles: [MembershipRole.OWNER],
      },
    },
  });

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
