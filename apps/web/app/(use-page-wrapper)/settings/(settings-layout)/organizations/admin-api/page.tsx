import { getTranslate, _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import EnterprisePage from "@components/EnterprisePage";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => `${t("admin")} ${t("api_reference")}`,
    (t) => t("leverage_our_api")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={`${t("admin")} ${t("api_reference")}`}
      description={t("leverage_our_api")}
      borderInShellHeader={false}>
      <EnterprisePage />
    </SettingsHeader>
  );
};

export default Page;
