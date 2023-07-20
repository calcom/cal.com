"use client";

// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/teams/[id]/sso.tsx
import TeamSSOView from "@calcom/features/ee/sso/page/teams-sso-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamSSOView as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
