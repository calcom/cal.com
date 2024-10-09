import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";

import ProfileView from "~/settings/my-account/profile-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      title={t("profile")}
      description={t("profile_description", { appName: APP_NAME })}
      borderInShellHeader={true}>
      <ProfileView />
    </SettingsHeader>
  );
};

export default Page;
