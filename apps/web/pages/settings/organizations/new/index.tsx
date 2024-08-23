"use client";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import CreateNewOrganizationPage, { LayoutWrapper } from "~/settings/organizations/new/create-new-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof LayoutWrapper;
}>(CreateNewOrganizationPage, {});

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export default Page;

export { getServerSideProps };
