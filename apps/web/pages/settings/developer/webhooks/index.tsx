import { useSession } from "next-auth/react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { CreateNewWebhookButton } from "@calcom/features/webhooks/components";
import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();
  const session = useSession();
  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;

  const { data, isPending } = trpc.viewer.webhook.getByViewer.useQuery(undefined, {
    enabled: session.status === "authenticated",
  });

  return (
    <>
      <Meta
        title={t("webhooks")}
        description={t("add_webhook_description", { appName: APP_NAME })}
        CTA={data && data.webhookGroups.length > 0 ? <CreateNewWebhookButton isAdmin={isAdmin} /> : <></>}
        borderInShellHeader={(data && data.profiles.length === 1) || !data?.webhookGroups?.length}
      />
      <WebhooksView />
    </>
  );
};
Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
