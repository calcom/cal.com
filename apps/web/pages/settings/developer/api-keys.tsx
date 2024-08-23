import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ApiKeysView from "~/settings/developer/api-keys-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(ApiKeysView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
