import { _generateMetadata } from "app/_utils";

import OrgAttributesEditPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-edit-view";

import { validateUserHasOrgAdmin } from "../../../../actions/validateUserHasOrgAdmin";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("attribute"),
    (t) => t("edit_attribute_description"),
    undefined,
    undefined,
    `/settings/organizations/attributes/${(await params).id}/edit`
  );

const OrgAttributesEditPageWrapper = async () => {
  await validateUserHasOrgAdmin();

  return <OrgAttributesEditPage />;
};

export default OrgAttributesEditPageWrapper;
