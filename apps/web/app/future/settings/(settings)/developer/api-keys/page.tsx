import { getFixedT, _generateMetadata } from "app/_utils";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
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

async function revalidateApiKeys() {
  "use server";
  revalidatePath("/future/settings/developer/api-keys");
}

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);
  const t = await getFixedT(session?.user.locale || "en");
  const userId = session?.user?.id;
  if (!userId) {
    notFound();
  }

  const apiKeysList = await ApiKeysRepository.getApiKeys({ userId });

  return (
    <SettingsHeader
      title={t("api_keys")}
      description={t("create_first_api_key_description", { appName: APP_NAME })}
      CTA={<NewApiKeyButton />}
      borderInShellHeader={true}>
      <ApiKeysView ssrProps={{ apiKeysList }} revalidateApiKeys={revalidateApiKeys} />
    </SettingsHeader>
  );
};

export default Page;
