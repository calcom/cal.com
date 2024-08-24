import PageWrapper from "@components/PageWrapper";

import EditView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
}>(EditView, {});

Page.PageWrapper = PageWrapper;

export default Page;
