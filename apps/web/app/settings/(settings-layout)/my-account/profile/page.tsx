import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { getDictionary, KeyOfTranslations, SupportedLocale } from "app/i18n/dictionaries";

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
  const t = await getDictionary(session?.user.locale as SupportedLocale);

  return (
    <SettingsHeader
      title={t["profile" as KeyOfTranslations]}
      description={t["profile_description" as KeyOfTranslations]}
      borderInShellHeader={true}>
      <ProfileView />
    </SettingsHeader>
  );
};

export default Page;
