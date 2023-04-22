import UsersEditView from "@calcom/features/ee/users/pages/users-edit-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = UsersEditView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
