import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { ThirdPartyServiceList } from "~/settings/admin/ThirdPartyServiceList";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("third_party_services"),
    (t) => t("third_party_services_description"),
    undefined,
    undefined,
    "/settings/admin/services"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("third_party_services")} description={t("third_party_services_description")}>
      <ThirdPartyServiceList />
    </SettingsHeader>
  );
};

export default Page;
