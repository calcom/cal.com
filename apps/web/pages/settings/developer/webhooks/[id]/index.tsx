import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import EditWebhookView from "@calcom/features/webhooks/pages/webhook-edit-view";
import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SkeletonContainer, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const searchParams = useCompatSearchParams();
  const id = searchParams?.get("id") ?? undefined;
  const { t } = useLocale();

  const { data: webhook } = trpc.viewer.webhook.get.useQuery(
    { webhookId: id },
    {
      suspense: true,
      enabled: !!id,
    }
  );

  if (!id) return <SkeletonContainer />;

  // I think we should do SSR for this page
  return (
    <>
      <Meta
        title={t("edit_webhook")}
        description={t("add_webhook_description", { appName: APP_NAME })}
        borderInShellHeader={true}
        backButton
      />
      <EditWebhookView webhook={webhook} />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
