import { Troubleshooter } from "@calcom/features/troubleshooter/Troubleshooter";
import { getLayout } from "@calcom/features/troubleshooter/layout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HeadSeo } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

function TroubleshooterPage() {
  const { t } = useLocale();
  return (
    <>
      <HeadSeo title={t("troubleshoot")} description={t("troubleshoot_availability")} />
      <Troubleshooter month={null} />
    </>
  );
}

TroubleshooterPage.getLayout = getLayout;
TroubleshooterPage.PageWrapper = PageWrapper;
export default TroubleshooterPage;
