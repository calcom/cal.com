import { ExperimentListingView } from "@calcom/features/experiments/pages/experiment-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";

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
      <ExperimentListingView />
    </SettingsHeader>
  );
};

export default Page;
