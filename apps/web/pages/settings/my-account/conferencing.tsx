"use client";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ConferencingView from "~/settings/my-account/conferencing-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(ConferencingView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
