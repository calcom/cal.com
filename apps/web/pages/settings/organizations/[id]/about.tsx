"use client";

import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

import PageWrapper from "@components/PageWrapper";

import AboutOrganizationPage, { LayoutWrapper } from "~/settings/organizations/[id]/about-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof LayoutWrapper;
}>(AboutOrganizationPage, {});

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps };
