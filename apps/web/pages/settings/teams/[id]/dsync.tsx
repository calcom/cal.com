import DirectorySyncTeamView from "@calcom/features/ee/dsync/page/team-dsync-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = DirectorySyncTeamView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
