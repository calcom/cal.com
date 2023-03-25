import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";

import { getLayout } from "@components/auth/layouts/AdminLayout";

const FlagsPage = () => <FlagListingView />;

FlagsPage.getLayout = getLayout;

export default FlagsPage;
