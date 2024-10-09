import OrgSSOView from "@calcom/features/ee/sso/page/orgs-sso-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <OrgSSOView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
