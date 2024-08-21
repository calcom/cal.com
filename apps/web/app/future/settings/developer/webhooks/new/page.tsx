import { getFixedT, _generateMetadata } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { NewWebhookView } from "@calcom/features/webhooks/pages/webhook-new-view";
import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);

  const t = await getFixedT(session?.user.locale || "en");

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
