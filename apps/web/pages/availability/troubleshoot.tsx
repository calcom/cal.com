import { getLayout } from "@calcom/features/troubleshooter/layout";

import PageWrapper from "@components/PageWrapper";

import Troubleshoot from "~/availability/troubleshoot/troubleshoot-view";

const TroubleshooterPage = () => <Troubleshoot />;
TroubleshooterPage.getLayout = getLayout;
TroubleshooterPage.PageWrapper = PageWrapper;
export default TroubleshooterPage;
