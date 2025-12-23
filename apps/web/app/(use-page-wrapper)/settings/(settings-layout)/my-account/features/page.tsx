import { _generateMetadata } from "app/_utils";

import FeaturesView from "~/settings/my-account/features-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_description"),
    undefined,
    undefined,
    "/settings/my-account/features"
  );

const Page = () => {
  return <FeaturesView />;
};

export default Page;
