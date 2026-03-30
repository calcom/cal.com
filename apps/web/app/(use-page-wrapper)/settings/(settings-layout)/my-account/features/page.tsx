import { _generateMetadata, getTranslate } from "app/_utils";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import FeaturesView from "~/settings/my-account/features-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("feature_opt_in_description"),
    undefined,
    undefined,
    "/settings/my-account/features"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("features")}>
          <AppHeaderDescription>{t("feature_opt_in_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <FeaturesView />
    </>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
