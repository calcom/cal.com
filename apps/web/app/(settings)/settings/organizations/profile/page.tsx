// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/organizations/profile.tsx
import OrgProfileView from "@calcom/features/ee/organizations/pages/settings/profile";
import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";
const Page = OrgProfileView as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
