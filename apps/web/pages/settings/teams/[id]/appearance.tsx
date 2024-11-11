import TeamAppearenceView from "@calcom/features/ee/teams/pages/team-appearance-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

const Page = () => <TeamAppearenceView />;

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
