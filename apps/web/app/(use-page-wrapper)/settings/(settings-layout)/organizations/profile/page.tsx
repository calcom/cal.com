import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";

import LegacyPage from "~/ee/organizations/profile";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import type { Membership } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { validateUserHasOrg } from "../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_org_description"),
    undefined,
    undefined,
    "/settings/organizations/profile"
  );

const Page = async () => {
  const session = await validateUserHasOrg();
  const t = await getTranslate();

  const orgRole = session.user.profile.organization.members?.find(
    (member: Membership) => member.userId === session.user.id
  )?.role;

  if (!orgRole) {
    return redirect("/settings/profile");
  }

  const { canRead, canEdit, canDelete } = await getResourcePermissions({
    userId: session.user.id,
    teamId: session.user.profile.organizationId,
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
