import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import PasswordViewWrapper from "~/settings/security/password-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("password"),
    (t) => t("password_description"),
    undefined,
    undefined,
    "/settings/security/password"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("password")} description={t("password_description")} borderInShellHeader={true}>
      <PasswordViewWrapper />
    </SettingsHeader>
  );
};

export default Page;
