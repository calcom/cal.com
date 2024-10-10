import { getFixedT, _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { NewWebhookView } from "@calcom/features/webhooks/pages/webhook-new-view";
import { APP_NAME } from "@calcom/lib/constants";
import { AppRepository } from "@calcom/lib/server/repository/app";
import { WebhookRepository } from "@calcom/lib/server/repository/webhook";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");
  const user = session?.user;
  if (!user || !user.id) {
    notFound();
  }
  const [installedApps, webhooks] = await Promise.all([
    AppRepository.getInstalledApps({
      user: {
        id: user.id,
        name: user.name ?? "",
        avatar: user.avatarUrl ?? "",
      },
      input: { variant: "other", onlyInstalled: true },
    }),
    WebhookRepository.getWebhooks({ userId: user.id, input: undefined }),
  ]);

  return (
    <SettingsHeader
      title={t("add_webhook")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      borderInShellHeader={true}
      backButton>
      <NewWebhookView ssrProps={{ installedApps, webhooks }} />
    </SettingsHeader>
  );
};

export default Page;
