import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ProfileImpersonationViewWrapper from "~/settings/security/impersonation-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(ProfileImpersonationViewWrapper, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
