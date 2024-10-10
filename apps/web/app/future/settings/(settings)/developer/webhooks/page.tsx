import { _generateMetadata, getFixedT } from "app/_utils";
import { notFound } from "next/navigation";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { CreateNewWebhookButton } from "@calcom/features/webhooks/components/CreateNewWebhookButton";
import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";
import { APP_NAME } from "@calcom/lib/constants";
import { WebhookRepository } from "@calcom/lib/server/repository/webhook";
import { UserPermissionRole } from "@calcom/prisma/enums";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const user = session?.user;
  if (!user) {
    notFound();
  }
  const isAdmin = user.role === UserPermissionRole.ADMIN;

  const t = await getFixedT(session?.user.locale || "en");

  const data = await WebhookRepository.getAllWebhooksByUserId({
    userId: user.id,
    organizationId: user.profile?.organizationId,
    userRole: user.role as UserPermissionRole,
  });

  return (
    <SettingsHeader
      title={t("webhooks")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      CTA={data && data.webhookGroups.length > 0 ? <CreateNewWebhookButton isAdmin={isAdmin} /> : <></>}
      borderInShellHeader={(data && data.profiles.length === 1) || !data?.webhookGroups?.length}>
      <WebhooksView ssrProps={{ webhooks: data }} />
    </SettingsHeader>
  );
};

export default Page;
