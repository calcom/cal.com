import { Troubleshooter } from "@calcom/features/troubleshooter/Troubleshooter";
import { getLayout } from "@calcom/features/troubleshooter/layout";

import PageWrapper from "@components/PageWrapper";

function TroubleshooterPage() {
  return <Troubleshooter />;
}

TroubleshooterPage.getLayout = getLayout;
TroubleshooterPage.PageWrapper = PageWrapper;
export default TroubleshooterPage;
