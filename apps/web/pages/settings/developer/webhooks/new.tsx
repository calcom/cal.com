import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import WebhookNewView from "@calcom/features/webhooks/pages/webhook-new-view";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("add_webhook")}
        description={t("add_webhook_description", { appName: APP_NAME })}
        backButton
        borderInShellHeader={true}
      />
      <WebhookNewView />
    </>
  );
};

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
