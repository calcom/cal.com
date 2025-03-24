import SettingsLayoutAppDir from "app/(use-page-wrapper)/settings/(settings-layout)/layout";
import { _generateMetadata, getTranslate } from "app/_utils";

import { DataTableProvider } from "@calcom/features/data-table/DataTableProvider";
import LegacyPage from "@calcom/features/ee/organizations/pages/members";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description")
  );

const CTA_CLASS_NAME = "org_members_header_cta";

const Page = async () => {
  const t = await getTranslate();

  const children = (
    <DataTableProvider defaultPageSize={25} toolbarContainerClassName={CTA_CLASS_NAME}>
      <SettingsHeader
        title={t("organization_members")}
        description={t("organization_description")}
        ctaClassName={CTA_CLASS_NAME}>
        <LegacyPage />
      </SettingsHeader>
    </DataTableProvider>
  );
  return await SettingsLayoutAppDir({ children, containerClassName: "lg:max-w-screen-2xl" });
};

export default Page;
