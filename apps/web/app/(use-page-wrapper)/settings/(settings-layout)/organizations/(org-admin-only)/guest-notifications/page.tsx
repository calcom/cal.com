import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "@calcom/features/ee/organizations/pages/settings/guest-notifications";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";

import { validateUserHasOrg } from "../../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("guest_notifications"),
    (t) => t("guest_notifications_description"),
    undefined,
    undefined,
    "/settings/organizations/guest-notifications"
  );

const Page = async () => {
  const t = await getTranslate();

  const session = await validateUserHasOrg();

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

  return (
    <SettingsHeader
      title={t("guest_notifications")}
      description={t("guest_notifications_org_description")}>
      <LegacyPage permissions={{ canRead, canEdit }} />
    </SettingsHeader>
  );
};

export default Page;