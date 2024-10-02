import PageWrapper from "@components/PageWrapper";

import PlatformBillingUpgrade from "~/settings/platform/billing/billing-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
}>(PlatformBillingUpgrade, {});

Page.PageWrapper = PageWrapper;

export default Page;
