import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";

import { validateOrgAdminAccess } from "@calcom/features/auth/lib/validateOrgAdminAccess";
import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("privacy"),
    (t) => t("privacy_organization_description"),
    undefined,
    undefined,
    "/settings/organizations/privacy"
  );

const Page = async () => {
  const [t, session] = await Promise.all([getTranslate(), validateOrgAdminAccess()]);

  const { canRead, canEdit } = await getResourcePermissions({
    userId: session.user.id,
    teamId: session.user.profile.organizationId,
    resource: Resource.Organization,
    userRole: session.user.org.role,
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
    return redirect("/settings/profile");
  }

  return (
    <SettingsHeader title={t("privacy")} description={t("privacy_organization_description")}>
      <PrivacyView permissions={{ canRead, canEdit }} />
    </SettingsHeader>
  );
};

export default Page;
