import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import AppearanceViewWrapper from "~/settings/my-account/appearance-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(AppearanceViewWrapper, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
