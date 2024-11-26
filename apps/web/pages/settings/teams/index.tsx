import TeamListingView from "@calcom/features/ee/teams/pages/team-listing-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <TeamListingView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
