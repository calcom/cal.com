import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import BillingView from "~/settings/billing/billing-view";

BillingView.getLayout = getLayout;
BillingView.PageWrapper = PageWrapper;

export default BillingView;
