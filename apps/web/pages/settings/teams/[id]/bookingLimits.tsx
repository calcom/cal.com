import TeamBookingLimitsView from "@calcom/features/ee/teams/pages/team-booking-limits-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamBookingLimitsView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
