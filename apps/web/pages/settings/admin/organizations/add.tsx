import { OrgAddPage } from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgAddPage";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgAddPage as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
