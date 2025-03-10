import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import ProfileImpersonationViewWrapper from "~/settings/security/impersonation-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("impersonation"),
    (t) => t("impersonation_description")
  );

const Page = async () => {
  const t = await getTranslate();

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
