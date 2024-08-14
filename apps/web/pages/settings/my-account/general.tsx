"use client";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import GeneralQueryView from "~/settings/my-account/general-view";

GeneralQueryView.getLayout = getLayout;
GeneralQueryView.PageWrapper = PageWrapper;

export default GeneralQueryView;
