import MembersView from "@calcom/features/ee/organizations/pages/settings/members";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = MembersView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
