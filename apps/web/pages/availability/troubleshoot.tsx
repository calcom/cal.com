import dynamic from "next/dynamic";
import { Suspense } from "react";

import { getLayout } from "@calcom/features/troubleshooter/layout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HeadSeo, Loader } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const TroubleshooterClientOnly = dynamic(
  () => import("@calcom/features/troubleshooter/Troubleshooter").then((mod) => mod.Troubleshooter),
  {
    ssr: false,
  }
);

function TroubleshooterPage() {
  const { t } = useLocale();
  return (
    <>
      <HeadSeo title={t("troubleshoot")} description={t("troubleshoot_availability")} />
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <Loader />
          </div>
        }>
        <TroubleshooterClientOnly month={null} />
      </Suspense>
    </>
  );
}

TroubleshooterPage.getLayout = getLayout;
TroubleshooterPage.PageWrapper = PageWrapper;
export default TroubleshooterPage;
