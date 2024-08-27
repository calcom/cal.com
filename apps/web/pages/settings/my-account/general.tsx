import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import GeneralQueryView from "~/settings/my-account/general-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(GeneralQueryView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
