import AdminOrgsPage from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgPage";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = AdminOrgsPage as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
