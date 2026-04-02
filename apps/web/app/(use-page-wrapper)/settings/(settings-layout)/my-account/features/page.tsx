import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import FeaturesView from "~/settings/my-account/features-view";

const generateMetadata = async (): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_description"),
    undefined,
    undefined,
    "/settings/my-account/features"
  );

const Page = (): ReactElement => {
  return <FeaturesView />;
};

export { generateMetadata };
export default Page;
