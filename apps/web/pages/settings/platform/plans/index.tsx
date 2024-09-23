import PageWrapper from "@components/PageWrapper";

import PlatformPlansView from "~/settings/platform/plans/platform-plans-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
}>(PlatformPlansView, {});

Page.PageWrapper = PageWrapper;

export default Page;
