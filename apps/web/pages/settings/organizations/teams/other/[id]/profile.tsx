import OtherTeamProfileView from "@calcom/features/ee/organizations/pages/settings/other-team-profile-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <OtherTeamProfileView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
