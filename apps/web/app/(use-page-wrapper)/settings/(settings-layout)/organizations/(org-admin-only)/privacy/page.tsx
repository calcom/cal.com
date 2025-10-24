import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";

import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";

import { validateUserHasOrg } from "../../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("privacy_and_security"),
    (t) => t("privacy_organization_description"),
    undefined,
    undefined,
    "/settings/organizations/privacy"
  );

const Page = async () => {
  const session = await validateUserHasOrg();
  const t = await getTranslate();

  if (!session?.user.id || !session?.user.profile?.organizationId || !session?.user.org) {
    return redirect("/settings/profile");
  }

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

  const watchlistPermissions = await getResourcePermissions({
    userId: session.user.id,
    teamId: session.user.profile.organizationId,
    resource: Resource.Watchlist,
    userRole: session.user.org.role,
    fallbackRoles: {
      read: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      create: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      delete: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canRead) {
    return redirect("/settings/profile");
  }

  return (
    <SettingsHeader title={t("privacy_and_security")} description={t("privacy_organization_description")}>
      <PrivacyView permissions={{ canRead, canEdit }} watchlistPermissions={watchlistPermissions} />
    </SettingsHeader>
  );
};

export default Page;
