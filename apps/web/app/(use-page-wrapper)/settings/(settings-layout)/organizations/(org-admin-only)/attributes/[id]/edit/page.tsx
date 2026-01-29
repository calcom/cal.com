import { _generateMetadata } from "app/_utils";

import { MembershipRole } from "@calcom/prisma/enums";
import OrgAttributesEditPage from "@calcom/web/modules/ee/organizations/attributes/attributes-edit-view";

import { validateUserHasOrgPerms } from "../../../../actions/validateUserHasOrgPerms";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("attribute"),
    (t) => t("edit_attribute_description"),
    undefined,
    undefined,
    `/settings/organizations/attributes/${(await params).id}/edit`
  );

const OrgAttributesEditPageWrapper = async () => {
  await validateUserHasOrgPerms({
    permission: "organization.attributes.update",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  return <OrgAttributesEditPage />;
};

export default OrgAttributesEditPageWrapper;
