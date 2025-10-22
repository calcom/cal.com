"use client";

import { usePathname } from "next/navigation";

import { DataTableProvider } from "@calcom/features/data-table/DataTableProvider";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import {
  RoutingFormResponsesTable,
  FailedBookingsByField,
  RoutedToPerPeriod,
  RoutingFunnel,
} from "@calcom/features/insights/components/routing";
import { InsightsOrgTeamsProvider } from "@calcom/features/insights/context/InsightsOrgTeamsProvider";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function InsightsRoutingFormResponsesPage() {
  const { t } = useLocale();
  const pathname = usePathname();

  if (!pathname) return null;

  return (
    <DataTableProvider tableIdentifier={pathname} useSegments={useSegments}>
      <InsightsOrgTeamsProvider>
        <div className="mb-4 space-y-4">
          <RoutingFormResponsesTable />

          <RoutingFunnel />

          <div className="flex flex-col gap-4 md:flex-row">
            <RoutedToPerPeriod />
            <FailedBookingsByField />
          </div>

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
