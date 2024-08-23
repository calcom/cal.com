"use client";

import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

import PageWrapper from "@components/PageWrapper";

import OnboardTeamMembersPage, { LayoutWrapper } from "~/settings/organizations/[id]/onboard-members-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof LayoutWrapper;
}>(OnboardTeamMembersPage, {});

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps };
