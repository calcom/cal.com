import AdminAPIViewWrapper from "@calcom/features/ee/organizations/pages/settings/admin-api";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(AdminAPIViewWrapper, {});

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
