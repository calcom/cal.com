"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import InsightsLayout from "@components/apps/layouts/InsightsLayout";

import InsightsBookingPage from "~/insights/insights-bookings-view";
import InsightsRoutingFormResponsesPage from "~/insights/insights-routing-view";
import InsightsWorkflowPage from "~/insights/insights-workflows-view";

type PageProps = {
  tab: "bookings" | "routing" | "workflows";
};

export default function Insights({ tab }: PageProps) {
  const { t } = useLocale();

  return (
    <>
      <InsightsLayout heading={t("insights")} subtitle={t("insights_subtitle")}>
        {tab === "bookings" && (
          <InsightsBookingPage timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />
        )}
        {tab === "routing" && <InsightsRoutingFormResponsesPage />}
        {tab === "workflows" && (
          <InsightsWorkflowPage timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />
        )}
      </InsightsLayout>
    </>
  );
}
