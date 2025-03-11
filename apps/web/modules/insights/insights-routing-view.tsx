"use client";

import { DataTableProvider } from "@calcom/features/data-table";
import {
  RoutingFormResponsesTable,
  FailedBookingsByField,
  RoutedToPerPeriod,
} from "@calcom/features/insights/components";
import { InsightsOrgTeamsProvider } from "@calcom/features/insights/context/InsightsOrgTeamsProvider";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function InsightsRoutingFormResponsesPage() {
  const { t } = useLocale();

  return (
    <DataTableProvider>
      <InsightsOrgTeamsProvider>
        <div className="mb-4 space-y-4">
          <RoutingFormResponsesTable />

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
