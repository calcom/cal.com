import PageWrapper from "@components/PageWrapper";

import PlatformView from "~/settings/platform/platform-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
}>(PlatformView, {});

Page.PageWrapper = PageWrapper;

export default Page;
