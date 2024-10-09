import TeamMembersView from "@calcom/features/ee/organizations/pages/settings/other-team-members-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <TeamMembersView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
