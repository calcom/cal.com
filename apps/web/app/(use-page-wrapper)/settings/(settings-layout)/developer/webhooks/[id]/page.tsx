import type { PageProps } from "app/_types";
import { getTranslate, _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { EditWebhookView } from "@calcom/features/webhooks/pages/webhook-edit-view";
import { APP_NAME } from "@calcom/lib/constants";
import { WebhookRepository } from "@calcom/lib/server/repository/webhook";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    `/settings/developer/webhooks/${(await params).id}`
  );

const getCachedWebhook = (id?: string) => {
  const fn = unstable_cache(
    async () => {
      return await WebhookRepository.findByWebhookId(id);
    },
    undefined,
    { revalidate: 3600, tags: [`viewer.webhook.get:${id}`] }
  );

  return fn();
};

const Page = async ({ params: _params }: PageProps) => {
  const t = await getTranslate();
  const params = await _params;
  const id = typeof params?.id === "string" ? params.id : undefined;

  const webhook = await getCachedWebhook(id);

  return (
    <SettingsHeader
      title={t("edit_webhook")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      borderInShellHeader={true}
      backButton>
      <EditWebhookView webhook={webhook} />
    </SettingsHeader>
  );
};

export default Page;
