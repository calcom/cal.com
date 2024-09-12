import PageWrapper from "@components/PageWrapper";

import CreateOAuthClientView from "~/settings/platform/oauth-clients/create-new-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
}>(CreateOAuthClientView, {});

Page.PageWrapper = PageWrapper;

export default Page;
