import OrgProfileView from "@calcom/features/ee/organizations/pages/settings/profile";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <OrgProfileView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
