"use client";

// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/teams/[id]/appearance.tsx
import TeamAppearenceView from "@calcom/features/ee/teams/pages/team-appearance-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamAppearenceView as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
