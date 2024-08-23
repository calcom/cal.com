import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import OutOfOfficeView from "~/settings/my-account/out-of-office-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(OutOfOfficeView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
