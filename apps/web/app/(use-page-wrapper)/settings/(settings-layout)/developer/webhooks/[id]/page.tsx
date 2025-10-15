import type { PageProps } from "app/_types";
import { getTranslate, _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { EditWebhookView } from "@calcom/features/webhooks/pages/webhook-edit-view";
import { APP_NAME } from "@calcom/lib/constants";
import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    `/settings/developer/webhooks/${(await params).id}`
  );

const Page = async ({ params: _params }: PageProps) => {
  const t = await getTranslate();
  const params = await _params;
  const id = typeof params?.id === "string" ? params.id : undefined;

  const webhookRepository = WebhookRepository.getInstance();
  const webhook = await webhookRepository.findByWebhookId(id);

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
