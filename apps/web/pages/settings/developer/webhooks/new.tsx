import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import WebhookNewPage from "@calcom/features/webhooks/pages/webhook-new-view";

import PageWrapper from "@components/PageWrapper";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(WebhookNewPage, {});

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
