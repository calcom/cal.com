"use client";

// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/organizations/appearance.tsx
import OrgAppearanceView from "@calcom/features/ee/organizations/pages/settings/appearance";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgAppearanceView as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
