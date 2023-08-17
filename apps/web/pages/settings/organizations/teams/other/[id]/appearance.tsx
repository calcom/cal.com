import TeamAppearanceView from "@calcom/features/ee/teams/pages/team-appearance-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamAppearanceView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
