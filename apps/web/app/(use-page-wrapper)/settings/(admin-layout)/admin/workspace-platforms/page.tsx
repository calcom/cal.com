import { _generateMetadata, getTranslate } from "app/_utils";

import LicenseRequired from "~/ee/common/components/LicenseRequired";
import WorkspacePlatformsPage from "~/ee/organizations/admin/views/WorkspacePlatformPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workspace_platforms"),
    (t) => t("workspace_platforms_description"),
    undefined,
    undefined,
    "/settings/admin/workspace-platforms"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("workspace_platforms")} description={t("workspace_platforms_description")}>
      <LicenseRequired>
        <WorkspacePlatformsPage />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
