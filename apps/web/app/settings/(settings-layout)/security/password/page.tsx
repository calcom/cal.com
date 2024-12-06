import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { headers } from "next/headers";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import PasswordViewWrapper from "~/settings/security/password-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("password"),
    (t) => t("password_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");

  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("password")} description={t("password_description")} borderInShellHeader={true}>
      <PasswordViewWrapper />
    </SettingsHeader>
  );
};

export default Page;
