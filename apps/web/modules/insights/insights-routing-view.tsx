"use client";

import { DataTableProvider } from "@calcom/features/data-table/DataTableProvider";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import {
  RoutingFormResponsesTable,
  FailedBookingsByField,
  RoutedToPerPeriod,
} from "@calcom/features/insights/components";
import { DropOffFunnel } from "@calcom/features/insights/components/DropOffFunnel";
import { InsightsOrgTeamsProvider } from "@calcom/features/insights/context/InsightsOrgTeamsProvider";
import { useInsightsParameters } from "@calcom/features/insights/hooks/useInsightsParameters";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

export default function InsightsRoutingFormResponsesPage() {
  const { t } = useLocale();

  return (
    <DataTableProvider useSegments={useSegments}>
      <InsightsOrgTeamsProvider>
        <div className="mb-4 space-y-4">
          <RoutingFormResponsesTable />

          <RoutingDropOffFunnel />

          <RoutedToPerPeriod />

          <FailedBookingsByField />

          <small className="text-default block text-center">
            {t("looking_for_more_insights")}{" "}
            <a
              className="text-blue-500 hover:underline"
              href="mailto:updates@cal.com?subject=Feature%20Request%3A%20More%20Analytics&body=Hey%20Cal.com%20Team%2C%20I%20love%20the%20analytics%20page%20but%20I%20am%20looking%20for%20...">
              {" "}
              {t("contact_support")}
            </a>
          </small>
        </div>
      </InsightsOrgTeamsProvider>
    </DataTableProvider>
  );
}

function RoutingDropOffFunnel() {
  const { scope, selectedTeamId, startDate, endDate } = useInsightsParameters();
  const { data, isSuccess, isPending } = trpc.viewer.insights.getDropOffData.useQuery(
    {
      scope,
      selectedTeamId,
      startDate,
      endDate,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isPending) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/4 rounded bg-gray-200" />
          <div className="h-64 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!isSuccess || !data) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <DropOffFunnel data={data} showMetrics={true} />
    </div>
  );
}
