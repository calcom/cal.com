"use client";

import { ColumnFilterType, ZSingleSelectFilterValue } from "@calcom/features/data-table";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { SkeletonButton } from "@calcom/ui/components/skeleton";
import { DataTableSkeleton } from "@calcom/web/modules/data-table/components";
import {
  FailedBookingsByField,
  RoutedToPerPeriod,
  RoutingFormResponsesTable,
  RoutingFunnel,
  RoutingKPICardsSkeleton,
} from "@calcom/web/modules/insights/components/routing";
import { useInsightsOrgTeams } from "@calcom/web/modules/insights/hooks/useInsightsOrgTeams";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { DataTableProvider } from "~/data-table/DataTableProvider";
import { useDataTable } from "~/data-table/hooks/useDataTable";
import { useFilterValue } from "~/data-table/hooks/useFilterValue";
import { useSegments } from "~/data-table/hooks/useSegments";
import { InsightsOrgTeamsProvider } from "../components/context/InsightsOrgTeamsProvider";

/**
 * Resolves the default routing form filter before rendering children.
 *
 * The routing insights page requires a `formId` filter to be set. This guard
 * fetches the available routing forms and sets the first one as the default
 * filter via the DataTable URL state (nuqs). Children (including the table)
 * are only mounted once the filter is present, preventing the visible flash
 * that previously occurred when the table rendered before the default was applied.
 *
 * This also prevents the user from clearing the routing form filter — if they
 * do, the guard re-applies the default from cached data.
 */
function RoutingFormDefaultFilterGuard({ children }: { children: React.ReactNode }) {
  const { isAll, teamId, userId } = useInsightsOrgTeams();
  const routingFormId = useFilterValue("formId", ZSingleSelectFilterValue)?.data as string | undefined;
  const { updateFilter } = useDataTable();

  const { data: formsData, isLoading: isFormsLoading } =
    trpc.viewer.insights.getRoutingFormsForFilters.useQuery(
      { userId, teamId, isAll },
      { refetchOnWindowFocus: false }
    );

  useEffect(() => {
    if (routingFormId) return;
    const defaultFormId = formsData?.[0]?.id;
    if (defaultFormId) {
      updateFilter("formId", { type: ColumnFilterType.SINGLE_SELECT, data: defaultFormId });
    }
  }, [routingFormId, formsData, updateFilter]);

  // Show skeleton while the default formId is being resolved:
  // - forms are still loading, OR
  // - forms loaded with data but the filter hasn't been applied yet
  if (!routingFormId && (isFormsLoading || (formsData && formsData.length > 0))) {
    return (
      <div className="flex-1">
        {/* Mirror DataTableWrapper toolbar + children layout */}
        <div className="grid w-full items-center gap-2 pb-4">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-wrap justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonButton className="h-8 w-24" />
                <SkeletonButton className="h-8 w-32" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonButton className="h-8 w-24" />
                <SkeletonButton className="h-8 w-20" />
              </div>
            </div>
          </div>
          <RoutingKPICardsSkeleton />
        </div>
        <DataTableSkeleton columns={4} columnWidths={[200, 200, 250, 250]} />
      </div>
    );
  }

  return <>{children}</>;
}

export default function InsightsRoutingFormResponsesPage({ timeZone }: { timeZone: string }) {
  const { t } = useLocale();
  const pathname = usePathname();

  if (!pathname) return null;

  return (
    <DataTableProvider tableIdentifier={pathname} useSegments={useSegments} timeZone={timeZone}>
      <InsightsOrgTeamsProvider>
        <RoutingFormDefaultFilterGuard>
          <div className="mb-4 stack-y-4">
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
        </RoutingFormDefaultFilterGuard>
      </InsightsOrgTeamsProvider>
    </DataTableProvider>
  );
}
