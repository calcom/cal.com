import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

import { NewWebhookView } from "@calcom/features/webhooks/pages/webhook-new-view";
import { APP_NAME } from "@calcom/lib/constants";
import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";
import { webhookRouter } from "@calcom/trpc/server/routers/viewer/webhook/_router";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    "/settings/developer/webhooks/new"
  );

const Page = async () => {
  const [appsCaller, webhookCaller] = await Promise.all([
    createRouterCaller(appsRouter),
    createRouterCaller(webhookRouter),
  ]);

  const [installedApps, webhooks] = await Promise.all([
    appsCaller.integrations({ variant: "other", onlyInstalled: true }),
    webhookCaller.list(),
  ]);

  return <NewWebhookView webhooks={webhooks} installedApps={installedApps} />;
};

export default Page;
