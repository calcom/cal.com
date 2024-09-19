import TeamProfileView from "@calcom/features/ee/teams/pages/team-profile-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <TeamProfileView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
