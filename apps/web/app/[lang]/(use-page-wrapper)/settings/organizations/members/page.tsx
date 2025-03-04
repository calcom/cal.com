import SettingsLayoutAppDir from "app/[lang]/(use-page-wrapper)/settings/(settings-layout)/layout";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "@calcom/features/ee/organizations/pages/members";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("organization_members"), t("organization_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  const children = (
    <SettingsHeader title={t("organization_members")} description={t("organization_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
  return await SettingsLayoutAppDir({ children, containerClassName: "lg:max-w-screen-2xl" });
};

export default Page;
