import SmsCreditsView from "@calcom/features/ee/teams/pages/team-sms-credits-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = SmsCreditsView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
