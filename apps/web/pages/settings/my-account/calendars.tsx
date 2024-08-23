"use client";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import CalendarsView from "~/settings/my-account/calendars-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof getLayout;
}>(CalendarsView, {});

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
