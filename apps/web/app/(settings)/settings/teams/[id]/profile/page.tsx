"use client";

// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/teams/[id]/profile.tsx
import TeamProfileView from "@calcom/features/ee/teams/pages/team-profile-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamProfileView as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
