import PageWrapper from "@components/PageWrapper";

import Troubleshoot, { getLayout } from "~/availability/troubleshoot/troubleshoot-view";

const TroubleshooterPage = () => <Troubleshoot />;
TroubleshooterPage.getLayout = getLayout;
TroubleshooterPage.PageWrapper = PageWrapper;
export default TroubleshooterPage;
