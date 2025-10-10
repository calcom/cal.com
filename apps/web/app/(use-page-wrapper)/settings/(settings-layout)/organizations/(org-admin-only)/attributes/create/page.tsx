import { _generateMetadata } from "app/_utils";

import OrgAttributesCreatePage from "@calcom/ee/organizations/pages/settings/attributes/attributes-create-view";
import { MembershipRole } from "@calcom/prisma/enums";

import { validateUserHasOrgPerms } from "../../../actions/validateUserHasOrgPerms";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attribute"),
    (t) => t("create_attribute_description"),
    undefined,
    undefined,
    "/settings/organizations/attributes/create"
  );

const OrgAttributesCreatePageWrapper = async () => {
  await validateUserHasOrgPerms({
    permission: "organization.attributes.create",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  return <OrgAttributesCreatePage />;
};

export default OrgAttributesCreatePageWrapper;
