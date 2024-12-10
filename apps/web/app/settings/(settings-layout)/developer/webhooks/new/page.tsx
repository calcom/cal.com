import { getTranslate, _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { NewWebhookView } from "@calcom/features/webhooks/pages/webhook-new-view";
import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("add_webhook")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      borderInShellHeader={true}
      backButton>
      <NewWebhookView />
    </SettingsHeader>
  );
};

export default Page;
