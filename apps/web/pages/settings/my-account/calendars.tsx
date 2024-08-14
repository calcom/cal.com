"use client";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import CalendarsView from "~/settings/my-account/calendars-view";

CalendarsView.getLayout = getLayout;
CalendarsView.PageWrapper = PageWrapper;

export default CalendarsView;
