import { _generateMetadata, getTranslate } from "app/_utils";

import { validateOrgAdminAccess } from "@calcom/features/auth/lib/validateOrgAdminAccess";
import OrgSSOView from "@calcom/features/ee/sso/page/orgs-sso-view";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sso_configuration"),
    (t) => t("sso_configuration_description_orgs"),
    undefined,
    undefined,
    "/settings/organizations/sso"
  );

const Page = async () => {
  const [t, session] = await Promise.all([getTranslate(), validateOrgAdminAccess()]);

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
    <SettingsHeader title={t("sso_configuration")} description={t("sso_configuration_description_orgs")}>
      <OrgSSOView permissions={{ canEdit }} />
    </SettingsHeader>
  );
};

export default Page;
