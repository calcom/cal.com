import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";

import PageWrapper from "@components/PageWrapper";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(WebhooksView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
