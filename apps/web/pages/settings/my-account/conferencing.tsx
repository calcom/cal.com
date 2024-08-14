"use client";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ConferencingView from "~/settings/my-account/conferencing-view";

ConferencingView.getLayout = getLayout;
ConferencingView.PageWrapper = PageWrapper;

export default ConferencingView;
