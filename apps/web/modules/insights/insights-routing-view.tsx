"use client";

import {
  RoutingFormResponsesTable,
  RoutingKPICards,
  FailedBookingsByField,
} from "@calcom/features/insights/components";
import { FiltersProvider } from "@calcom/features/insights/context/FiltersProvider";
import { Filters } from "@calcom/features/insights/filters";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import InsightsLayout from "./layout";

export default function InsightsPage() {
  const { t } = useLocale();

  return (
    <InsightsLayout>
      <FiltersProvider>
        <Filters showRoutingFilters />

        <div className="mb-4 space-y-4">
          <RoutingKPICards />

          <RoutingFormResponsesTable />

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
