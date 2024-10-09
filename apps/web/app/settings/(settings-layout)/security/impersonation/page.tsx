import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import ProfileImpersonationViewWrapper from "~/settings/security/impersonation-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("impersonation"),
    (t) => t("impersonation_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      title={t("impersonation")}
      description={t("impersonation_description")}
      borderInShellHeader={true}>
      <ProfileImpersonationViewWrapper />
    </SettingsHeader>
  );
};

export default Page;
