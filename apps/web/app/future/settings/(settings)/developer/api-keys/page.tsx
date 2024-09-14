import { getFixedT, _generateMetadata, revalidateApiKeys } from "app/_utils";
import { notFound } from "next/navigation";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { ApiKeysRepository } from "@calcom/lib/server/repository/apiKeys";

import ApiKeysView from "~/settings/developer/api-keys-view";
import NewApiKeyButton from "~/settings/developer/components/CreateApiKeyButton";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("api_keys"),
    (t) => t("create_first_api_key_description", { appName: APP_NAME })
  );

const Page = async () => {
  // FIXME: Refactor me once next-auth endpoint is migrated to App Router
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");
  const userId = session?.user?.id;
  if (!userId) {
    notFound();
  }

  try {
    const apiKeysList = await ApiKeysRepository.getApiKeys({ userId });

    return (
      <SettingsHeader
        title={t("api_keys")}
        description={t("create_first_api_key_description", { appName: APP_NAME })}
        CTA={<NewApiKeyButton />}
        borderInShellHeader={true}>
        <ApiKeysView
          ssrProps={{ apiKeysList }}
          revalidateApiKeys={async () => {
            revalidateApiKeys("SETTINGS_DEVELOPER_API_KEYS");
          }}
        />
      </SettingsHeader>
    );
  } catch (error) {
    notFound();
  }
};

export default Page;
