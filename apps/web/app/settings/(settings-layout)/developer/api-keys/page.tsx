import { getFixedT, _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";

import ApiKeysView, { NewApiKeyButton } from "~/settings/developer/api-keys-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("api_keys"),
    (t) => t("create_first_api_key_description", { appName: APP_NAME })
  );

const Page = async () => {
  // FIXME: Refactor me once next-auth endpoint is migrated to App Router
  const headersList = await headers();
  const locale = headersList.get("x-locale");

  const t = await getFixedT(locale ?? "en");

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
