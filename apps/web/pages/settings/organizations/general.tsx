import OrgGeneralView from "@calcom/features/ee/organizations/pages/settings/general";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <OrgGeneralView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
