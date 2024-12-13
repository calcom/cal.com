import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import WorkspacePlatformsPage from "@calcom/features/ee/organizations/pages/settings/admin/WorkspacePlatformPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workspace_platforms"),
    (t) => t("workspace_platforms_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");
  return (
    <SettingsHeader title={t("workspace_platforms")} description={t("workspace_platforms_description")}>
      <LicenseRequired>
        <WorkspacePlatformsPage />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
