import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import WebhookEditView from "@calcom/features/webhooks/pages/webhook-edit-view";

import PageWrapper from "@components/PageWrapper";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(WebhookEditView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
