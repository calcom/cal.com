import { getLayout } from "@calcom/features/MainLayout";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import PageWrapper from "@components/PageWrapper";

export default function TimeCapsulePage() {
  const { t } = useLocale();

  return (
    <div>
      <ShellMain heading="Time Capsule" subtitle={t("insights_subtitle")}>
        <div>Time capsule</div>
      </ShellMain>
    </div>
  );
}

TimeCapsulePage.PageWrapper = PageWrapper;
TimeCapsulePage.getLayout = getLayout;

// If feature flag is disabled, return not found on getServerSideProps
export const getServerSideProps = async () => {
  //   const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  //   const flags = await getFeatureFlagMap(prisma);

  //   if (flags.insights === false) {
  //     return {
  //       notFound: true,
  //     };
  //   }

  return {
    props: {},
  };
};
