import { getLayout } from "@calcom/features/MainLayout";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import PageWrapper from "@components/PageWrapper";

export default function InsightsPage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  return (
    <div>
      <ShellMain heading="Insights" subtitle={t("insights_subtitle")}>
        <h1>Hi</h1>
      </ShellMain>
    </div>
  );
}

InsightsPage.PageWrapper = PageWrapper;
InsightsPage.getLayout = getLayout;

// If feature flag is disabled, return not found on getServerSideProps
export const getServerSideProps = async () => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);

  if (flags.insights === false) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
};
