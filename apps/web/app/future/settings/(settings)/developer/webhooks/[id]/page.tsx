import type { PageProps } from "app/_types";
import { getFixedT, _generateMetadata } from "app/_utils";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { EditWebhookView } from "@calcom/features/webhooks/pages/webhook-edit-view";
import { APP_NAME } from "@calcom/lib/constants";
import { AppRepository } from "@calcom/lib/server/repository/app";
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
  const user = session?.user;
  if (!id || !user || !user.id) {
    notFound();
  }

  const [webhook, installedApps, webhooks] = await Promise.all([
    WebhookRepository.findByWebhookId(id),
    AppRepository.getInstalledApps({
      user: { id: user.id, name: user.name ?? "", avatar: user.avatarUrl ?? "" },
      input: { variant: "other", onlyInstalled: true },
    }),
    WebhookRepository.getWebhooks({ userId: user.id, input: undefined }),
  ]);

  console.log("This is the webhook", webhook);
  return (
    <SettingsHeader
      title={t("edit_webhook")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      borderInShellHeader={true}
      backButton>
      <EditWebhookView webhook={webhook} ssrProps={{ installedApps, webhooks }} />
    </SettingsHeader>
  );
};

export default Page;
