import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import AppStoreRatingsView from "~/settings/admin/app-store-ratings-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    (t) => t("app_store_ratings"),
    undefined,
    undefined,
    "/settings/admin/app-store-ratings"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("admin")} description={t("app_store_ratings")}>
      <AppStoreRatingsView />
    </SettingsHeader>
  );
};

export default Page;
