import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { MembershipRole } from "@calcom/prisma/enums";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OrganizationFeaturesView from "~/ee/organizations/features-view";
import { validateUserHasOrg } from "../../actions/validateUserHasOrg";

export const generateMetadata = async (): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_org_description"),
    undefined,
    undefined,
    "/settings/organizations/features"
  );

const Page = async () => {
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

  return <OrganizationFeaturesView canEdit={canEdit} />;
};

export default Page;
