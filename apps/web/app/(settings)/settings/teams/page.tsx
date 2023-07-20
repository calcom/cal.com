// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/teams/index.ts
import TeamListView from "@calcom/features/ee/teams/pages/team-listing-view";

import PageWrapper from "@components/PageWrapper";
import type { CalPageWrapper } from "@components/PageWrapper";

const Page = TeamListView as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
