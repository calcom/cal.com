// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/admin/flags.tsx
import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";
import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";
const FlagsPage = () => <FlagListingView />;
FlagsPage.getLayout = getLayout;
FlagsPage.PageWrapper = PageWrapper;
export default FlagsPage;
