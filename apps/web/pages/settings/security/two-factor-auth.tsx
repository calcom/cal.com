import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import TwoFactorAuthView from "~/settings/security/two-factor-auth-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(TwoFactorAuthView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
