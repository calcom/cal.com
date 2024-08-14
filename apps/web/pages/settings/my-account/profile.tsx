"use client";

// eslint-disable-next-line no-restricted-imports
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ProfileView from "~/settings/my-account/profile-view";

ProfileView.getLayout = getLayout;
ProfileView.PageWrapper = PageWrapper;

export default ProfileView;
