"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import InsightsLayout from "@components/apps/layouts/InsightsLayout";

import InsightsPage from "~/insights/insights-bookings-view";
import InsightsRoutingFormResponsesPage from "~/insights/insights-routing-view";

type PageProps = {
  tab: "bookings" | "routing" | "workflows";
};

export default function Insights({ tab }: PageProps) {
  const { t } = useLocale();

  return (
    <>
      <InsightsLayout heading={t("insights")} subtitle={t("insights_subtitle")}>
        {tab === "bookings" && <InsightsPage timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />}
        {tab === "routing" && <InsightsRoutingFormResponsesPage />}
      </InsightsLayout>
    </>
  );
}
