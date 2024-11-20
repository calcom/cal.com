import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useRef } from "react";
import { useInView } from "react-intersection-observer";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Avatar, ToggleGroup, Button, DataTable, DataTableSkeleton } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

interface FormCardProps {
  selectedPeriod: string;
  onPeriodChange: (value: string) => void;
}

function FormCard({ selectedPeriod, onPeriodChange }: FormCardProps) {
  const { t } = useLocale();

  return (
    <div className="border-subtle w-full rounded-md border">
      <div className="flex flex-col">
        <div className="p-4">
          <ToggleGroup
            options={[
              { label: t("per_day"), value: "perDay" },
              { label: t("per_week"), value: "perWeek" },
              { label: t("per_month"), value: "perMonth" },
            ]}
            className="w-fit"
            value={selectedPeriod}
            onValueChange={(value) => value && onPeriodChange(value)}
          />
        </div>
      </div>
    </div>
  );
}

type RoutedToTableRow = {
  id: number;
  name: string;
  avatarUrl: string | null;
  stats: { [key: string]: number };
};

export function RoutedToPerPeriod() {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { selectedTeamId, isAll, selectedRoutingFormId, dateRange } = filter;
  const [selectedPeriod, setSelectedPeriod] = useQueryState("selectedPeriod", {
    defaultValue: "perWeek",
  });
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView();

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } =
    trpc.viewer.insights.routedToPerPeriod.useInfiniteQuery(
      {
        teamId: selectedTeamId ?? undefined,
        startDate: dateRange[0]?.toISOString() ?? "",
        endDate: dateRange[1]?.toISOString() ?? "",
        period: selectedPeriod as "perDay" | "perWeek" | "perMonth",
        isAll: !!isAll,
        routingFormId: selectedRoutingFormId ?? undefined,
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => {
          if (!lastPage.users.nextCursor && !lastPage.periodStats.nextCursor) {
            return undefined;
          }

          return {
            userCursor: lastPage.users.nextCursor,
            periodCursor: lastPage.periodStats.nextCursor,
          };
        },
        enabled: !!dateRange[0] && !!dateRange[1],
      }
    );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const flattenedUsers = useMemo(
    () =>
      Array.from(
        new Map(data?.pages.flatMap((page) => page.users.data).map((user) => [user.id, user])).values()
      ),
    [data?.pages]
  );

  const flattenedStats = useMemo(
    () =>
      Array.from(
        new Map(
          data?.pages
            .flatMap((page) => page.periodStats.data)
            .map((stat) => [stat.period_start.toString(), stat])
        ).values()
      ).sort((a, b) => a.period_start.getTime() - b.period_start.getTime()),
    [data?.pages]
  );

  const processedData: RoutedToTableRow[] = useMemo(() => {
    return flattenedUsers.map((user) => {
      const stats = flattenedStats.reduce((acc, period) => {
        const stat = data?.pages
          .flatMap((page) => page.periodStats.data)
          .find((s) => s.userId === user.id && s.period_start.getTime() === period.period_start.getTime());
        acc[period.period_start.toString()] = stat?.total || 0;
        return acc;
      }, {} as { [key: string]: number });

      return {
        id: user.id,
        name: user.name || "",
        avatarUrl: user.avatarUrl,
        stats,
      };
    });
  }, [flattenedUsers, flattenedStats, data?.pages]);

  const columnHelper = createColumnHelper<RoutedToTableRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: t("user"),
        cell: (info) => (
          <div className="flex items-center">
            <Avatar
              size="sm"
              imageSrc={info.row.original.avatarUrl}
              alt={info.getValue() || ""}
              className="mr-2"
            />
            <span>{info.getValue()}</span>
          </div>
        ),
        size: 200,
        meta: {
          sticky: {
            position: "left",
            gap: 0,
          },
        },
      }),
      ...flattenedStats.map((period) =>
        columnHelper.accessor((row) => row.stats[period.period_start.toString()], {
          id: period.period_start.toString(),
          header: new Date(period.period_start).toLocaleDateString(),
          size: 120,
        })
      ),
    ],
    [columnHelper, flattenedStats, t]
  );

  const table = useReactTable({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="w-full text-sm">
        <div className="flex h-12 items-center">
          <h2 className="text-emphasis text-md font-semibold">{t("routed_to_per_period")}</h2>
        </div>

        <FormCard selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />

        <div className="mt-6">
          <DataTableSkeleton columns={5} columnWidths={[200, 120, 120, 120, 120]} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-sm">
      <div className="flex h-12 items-center">
        <h2 className="text-emphasis text-md font-semibold">{t("routed_to_per_period")}</h2>
      </div>

      <FormCard selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />

      <div className="mt-6">
        <DataTable table={table} tableContainerRef={tableContainerRef} isPending={isFetchingNextPage}>
          {hasNextPage && (
            <div className="flex justify-center p-4">
              <Button ref={ref} loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
                {t("load_more")}
              </Button>
            </div>
          )}
        </DataTable>
      </div>
    </div>
  );
}
