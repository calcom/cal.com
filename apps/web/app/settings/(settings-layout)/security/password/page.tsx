import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import PasswordViewWrapper from "~/settings/security/password-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("password"),
    (t) => t("password_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("password")} description={t("password_description")} borderInShellHeader={true}>
      <PasswordViewWrapper />
    </SettingsHeader>
  );
};

export default Page;
