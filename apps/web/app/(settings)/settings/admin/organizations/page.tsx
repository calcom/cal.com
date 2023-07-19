// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/admin/organizations/index.tsx
import UnverifiedOrgsPage from "@calcom/features/ee/organizations/pages/settings/admin/unverifiedOrgPage";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = UnverifiedOrgsPage as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
