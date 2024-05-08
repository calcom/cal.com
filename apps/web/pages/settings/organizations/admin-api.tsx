import AdminAPIView from "@calcom/features/ee/organizations/pages/settings/admin-api";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = AdminAPIView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
