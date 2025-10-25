import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta, Shell } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import NoShowHostsGraph from "@components/insights/NoShowHostsGraph";
import CSATGraph from "@components/insights/CSATGraph";

const InsightsPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>{t("loading")}</div>;
  }

  return (
    <Shell heading={t("insights")} subtitle={t("insights_description")}>
      <Meta title={t("insights")} description={t("insights_description")} />
      <div className="space-y-6">
        <div className="rounded-md border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
            {t("no_show_hosts_over_time")}
          </h2>
          <NoShowHostsGraph />
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
            {t("csat_over_time")}
          </h2>
          <CSATGraph />
        </div>
      </div>
    </Shell>
  );
};

InsightsPage.getLayout = getLayout;
InsightsPage.PageWrapper = PageWrapper;

export default InsightsPage;