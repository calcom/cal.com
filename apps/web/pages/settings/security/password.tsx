import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import PasswordViewWrapper from "~/settings/security/password-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(PasswordViewWrapper, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
