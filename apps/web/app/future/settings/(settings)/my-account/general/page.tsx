import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import GeneralQueryView from "~/settings/my-account/general-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("general"),
    (t) => t("general_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");
  return (
    <SettingsHeader title={t("general")} description={t("general_description")} borderInShellHeader={true}>
      <GeneralQueryView />
    </SettingsHeader>
  );
};

export default Page;
