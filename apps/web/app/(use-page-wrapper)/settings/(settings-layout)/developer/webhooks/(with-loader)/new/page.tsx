import { createRouterCaller } from "app/_trpc/context";
import { getTranslate, _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { NewWebhookView } from "@calcom/features/webhooks/pages/webhook-new-view";
import { APP_NAME } from "@calcom/lib/constants";
import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";
import { webhookRouter } from "@calcom/trpc/server/routers/viewer/webhook/_router";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

const Page = async () => {
  const [t, appsCaller, webhookCaller] = await Promise.all([
    getTranslate(),
    createRouterCaller(appsRouter),
    createRouterCaller(webhookRouter),
  ]);

  const [installedApps, webhooks] = await Promise.all([
    appsCaller.integrations({ variant: "other", onlyInstalled: true }),
    webhookCaller.list(),
  ]);

  return (
    <SettingsHeader
      title={t("add_webhook")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      borderInShellHeader={true}
      backButton>
      <NewWebhookView webhooks={webhooks} installedApps={installedApps} />
    </SettingsHeader>
  );
};

export default Page;
