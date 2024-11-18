import OtherTeamListView from "@calcom/features/ee/organizations/pages/settings/other-team-listing-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <OtherTeamListView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
