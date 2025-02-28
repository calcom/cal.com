import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import WorkspacePlatformsPage from "@calcom/features/ee/organizations/pages/settings/admin/WorkspacePlatformPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("workspace_platforms"), t("workspace_platforms_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return (
    <SettingsHeader title={t("workspace_platforms")} description={t("workspace_platforms_description")}>
      <LicenseRequired>
        <WorkspacePlatformsPage />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
