import type { PageProps } from "app/_types";
import { getTranslate, _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";

import ApiKeysView, { NewApiKeyButton } from "~/settings/developer/api-keys-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("api_keys"), t("create_first_api_key_description", { appName: APP_NAME }));
};
const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

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
