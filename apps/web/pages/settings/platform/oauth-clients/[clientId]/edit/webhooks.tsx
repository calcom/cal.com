import PageWrapper from "@components/PageWrapper";

import EditWebhooksView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-webhooks-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
}>(EditWebhooksView, {});

Page.PageWrapper = PageWrapper;

export default Page;
