"use client";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import AppearanceViewWrapper from "~/settings/my-account/appearance-view";

AppearanceViewWrapper.getLayout = getLayout;
AppearanceViewWrapper.PageWrapper = PageWrapper;

export default AppearanceViewWrapper;
