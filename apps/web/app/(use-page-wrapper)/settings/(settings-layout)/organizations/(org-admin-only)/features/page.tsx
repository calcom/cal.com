import { redirect } from "next/navigation";

import { _generateMetadata, getTranslate } from "app/_utils";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { MembershipRole } from "@calcom/prisma/enums";

import OrganizationFeaturesView from "~/ee/organizations/features-view";

import { validateUserHasOrg } from "../../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_org_description"),
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
    resource: Resource.FeatureOptIn,
    userRole: session.user.org?.role,
    fallbackRoles: {
      read: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canRead) {
    return redirect("/settings/organizations/profile");
  }

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("features")}>
          <AppHeaderDescription>{t("feature_opt_in_org_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <OrganizationFeaturesView canEdit={canEdit} />
    </>
  );
};

export default Page;
