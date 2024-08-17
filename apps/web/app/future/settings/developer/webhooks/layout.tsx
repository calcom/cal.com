import { getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayoutAppDir";
import { CreateNewWebhookButton } from "@calcom/features/webhooks/components/CreateNewWebhookButton";
import { APP_NAME } from "@calcom/lib/constants";
import { WebhookRepository } from "@calcom/lib/server/repository/webhook";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(AUTH_OPTIONS);

  const t = await getFixedT(session?.user.locale || "en");

  const webhooks = await WebhookRepository.getAllWebhooksByUserId({
    userId: session?.user.id,
    organizationId: session?.user.org?.id,
    userRole: session?.user.role,
  });

  return (
    <SettingsLayout
      title={t("webhooks")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      CTA={<CreateNewWebhookButton isAdmin={session?.user.role} />}>
      {children}
    </SettingsLayout>
  );
}
