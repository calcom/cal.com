import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import PlansView from "~/settings/billing/plans/plans-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("plans"),
    (t) => t("plans_page_description"),
    undefined,
    undefined,
    "/settings/billing/plans"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("plans")} description={t("plans_page_description")}>
      <PlansView context="personal" />
    </SettingsHeader>
  );
};

export default Page;
