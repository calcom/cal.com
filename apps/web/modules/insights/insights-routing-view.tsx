"use client";

import {
  FailedBookingsByField,
  RoutingFormResponsesTable,
  RoutingKPICards,
  RoutedToPerPeriod,
} from "@calcom/features/insights/components";
import { FiltersProvider } from "@calcom/features/insights/context/FiltersProvider";
import { RoutingInsightsFilters } from "@calcom/features/insights/filters/routing/FilterBar";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import InsightsLayout from "./layout";

export default function InsightsPage() {
  const { t } = useLocale();

  return (
    <InsightsLayout>
      <FiltersProvider>
        <div className="mb-4 space-y-4">
          <RoutingFormResponsesTable>
            {/* We now render the "filters and KPI as a children of the table but we still need to pass the table instance to it so we can access column status in the toolbar.*/}
            {(table) => (
              <div className="header mb-4">
                <div className="flex items-center justify-between">
                  <RoutingInsightsFilters table={table} />
                </div>
                <RoutingKPICards />
              </div>
            )}
          </RoutingFormResponsesTable>

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
      </FiltersProvider>
    </InsightsLayout>
  );
}
