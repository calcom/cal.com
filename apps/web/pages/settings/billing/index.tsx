import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import BillingView from "~/settings/billing/billing-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(BillingView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
