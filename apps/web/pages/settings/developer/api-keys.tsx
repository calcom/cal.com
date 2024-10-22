import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ApiKeysView from "~/settings/developer/api-keys-view";

const Page = () => {
  return <ApiKeysView />;
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
