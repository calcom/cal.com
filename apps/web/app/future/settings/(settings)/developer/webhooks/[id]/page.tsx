import type { PageProps } from "app/_types";
import { getFixedT, _generateMetadata } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
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
  const session = await getServerSession(AUTH_OPTIONS);

  const t = await getFixedT(session?.user.locale || "en");
  const id = typeof params?.id === "string" ? params.id : undefined;

  const webhook = await WebhookRepository.findByWebhookId(id);
  console.log("This is the webhook", webhook);
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
