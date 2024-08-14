import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import OutOfOfficeView from "~/settings/my-account/out-of-office-view";

const OutOfOfficePage = () => <OutOfOfficeView />;

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
