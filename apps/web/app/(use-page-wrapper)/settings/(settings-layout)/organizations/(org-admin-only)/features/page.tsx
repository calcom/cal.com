import type { Metadata } from "next";
import type { ReactElement } from "react";

import { _generateMetadata } from "app/_utils";

import OrganizationFeaturesView from "~/ee/organizations/features-view";

import { validateUserHasOrgAdmin } from "../../actions/validateUserHasOrgAdmin";

const generateMetadata = async (): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_org_description"),
    undefined,
    undefined,
    "/settings/organizations/features"
  );

const Page = async (): Promise<ReactElement> => {
  await validateUserHasOrgAdmin();

  return <OrganizationFeaturesView />;
};

export { generateMetadata };
export default Page;
