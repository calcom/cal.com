import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { MembershipRole } from "@calcom/prisma/enums";
import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";
import OrgSettingsAttributesPage from "~/ee/organizations/attributes/attributes-list-view";
import { validateUserHasOrg } from "../../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attributes"),
    (t) => t("attribute_meta_description"),
    undefined,
    undefined,
    "/settings/organizations/attributes"
  );

const Page = async () => {
  const t = await getTranslate();
  const session = await validateUserHasOrg();

  const { canRead, canEdit, canDelete, canCreate } = await getResourcePermissions({
    userId: session.user.id,
    teamId: session.user.profile.organizationId,
    resource: Resource.Attributes,
    userRole: session.user.org.role,
    fallbackRoles: {
      read: {
        roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      delete: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      create: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canRead) {
    return redirect("/settings/profile");
  }

  return (
    <SettingsHeader title={t("attributes")} description={t("attribute_meta_description")}>
      <OrgSettingsAttributesPage permissions={{ canEdit, canDelete, canCreate }} />
    </SettingsHeader>
  );
};

export default Page;
