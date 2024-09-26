"use client";

import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

const FlagsPage = () => (
  <div>
    <Meta title="Feature Flags" description="Here you can toggle your Cal.com instance features." />
    <FlagListingView />
  </div>
);

FlagsPage.getLayout = getLayout;
FlagsPage.PageWrapper = PageWrapper;

export default FlagsPage;
