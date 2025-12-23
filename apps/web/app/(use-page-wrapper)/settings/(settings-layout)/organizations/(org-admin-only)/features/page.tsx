import { _generateMetadata } from "app/_utils";

import OrganizationFeaturesView from "~/settings/organizations/features-view";

import { validateUserHasOrgAdmin } from "../../actions/validateUserHasOrgAdmin";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_org_description"),
    undefined,
    undefined,
    "/settings/organizations/features"
  );

const Page = async () => {
  await validateUserHasOrgAdmin();

  return <OrganizationFeaturesView />;
};

export default Page;
