import { _generateMetadata, getTranslate } from "app/_utils";

import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";

import OrganizationFeaturesView from "~/settings/organizations/organization-features-view";

import { validateUserHasOrg } from "../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("organization_features_description"),
    undefined,
    undefined,
    "/settings/organizations/features"
  );

const Page = async () => {
  const t = await getTranslate();

  const session = await validateUserHasOrg();

  const { canRead, canEdit } = await getResourcePermissions({
    userId: session.user.id,
    teamId: session.user.profile.organizationId,
    resource: Resource.Feature,
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
    return (
      <SettingsHeader
        title={t("features")}
        description={t("organization_features_description")}
        borderInShellHeader={true}>
        <div className="border-subtle rounded-b-xl border-x border-b px-4 py-8 sm:px-6">
          <p className="text-subtle text-sm">{t("no_permission_to_view")}</p>
        </div>
      </SettingsHeader>
    );
  }

  return <OrganizationFeaturesView organizationId={session.user.profile.organizationId} canEdit={canEdit} />;
};

export default Page;
