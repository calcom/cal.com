import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";

import ProfileView from "~/settings/my-account/profile-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_description")
  );

const Page = async () => {
  const t = await getTranslate();

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
