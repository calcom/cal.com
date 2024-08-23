"use client";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ProfileView from "~/settings/my-account/profile-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(ProfileView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
