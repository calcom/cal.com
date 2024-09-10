import { getFixedT, _generateMetadata } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";

import ApiKeysView from "~/settings/developer/api-keys-view";
import NewApiKeyButton from "~/settings/developer/components/CreateApiKeyButton";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("api_keys"),
    (t) => t("create_first_api_key_description", { appName: APP_NAME })
  );

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);

  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      title={t("api_keys")}
      description={t("create_first_api_key_description", { appName: APP_NAME })}
      CTA={<NewApiKeyButton />}
      borderInShellHeader={true}>
      <ApiKeysView />
    </SettingsHeader>
  );
};

export default Page;
