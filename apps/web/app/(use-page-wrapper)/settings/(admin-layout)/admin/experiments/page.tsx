import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import { ExperimentsListingView } from "~/settings/admin/experiments/experiments-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("experiments"),
    (t) => t("admin_experiments_description"),
    undefined,
    undefined,
    "/settings/admin/experiments"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("experiments")} description={t("admin_experiments_description")}>
      <ExperimentsListingView />
    </SettingsHeader>
  );
};

export default Page;
