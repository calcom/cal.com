import UsersListingView from "@calcom/features/ee/users/pages/users-listing-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = UsersListingView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
