import type { PageProps } from "app/_types";
import { getTranslate, _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { EditWebhookView } from "@calcom/features/webhooks/pages/webhook-edit-view";
import { APP_NAME } from "@calcom/lib/constants";
import { WebhookRepository } from "@calcom/lib/server/repository/webhook";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate();
  const id = typeof params?.id === "string" ? params.id : undefined;

  const webhook = await WebhookRepository.findByWebhookId(id);

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
