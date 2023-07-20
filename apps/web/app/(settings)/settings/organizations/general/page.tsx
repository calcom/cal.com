"use client";

// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/organizations/general.tsx
import OrgGeneralView from "@calcom/features/ee/organizations/pages/settings/general";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgGeneralView as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
