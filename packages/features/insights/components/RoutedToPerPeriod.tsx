import type { TFunction } from "next-i18next";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useRef } from "react";
import { useInView } from "react-intersection-observer";

import { DataTableSkeleton } from "@calcom/features/data-table";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import {
  Avatar,
  ToggleGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calcom/ui";

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
  performance: "above_average" | "at_average" | "below_average" | "median" | "no_data";
  totalBookings: number;
};

const getPerformanceColor = (performance: RoutedToTableRow["performance"]) => {
  switch (performance) {
    case "above_average":
      return "text-green-700";
    case "below_average":
      return "text-red-700";
    case "median":
      return "text-orange-700";
    case "at_average":
      return "text-blue-700";
    default:
      return "text-gray-700";
  }
};

const getPerformanceLabel = (performance: RoutedToTableRow["performance"], t: TFunction) => {
  switch (performance) {
    case "above_average":
      return t("above_average");
    case "below_average":
      return t("below_average");
    case "median":
      return t("median");
    case "at_average":
      return t("at_average");
    default:
      return t("no_data");
  }
};

export function RoutedToPerPeriod() {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { selectedTeamId, isAll, selectedRoutingFormId, dateRange } = filter;
  const [selectedPeriod, setSelectedPeriod] = useQueryState("selectedPeriod", {
    defaultValue: "perWeek",
  });
  const { ref, inView } = useInView();
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
    if (inView && hasNextPage && !isFetchingNextPage && tableContainerRef.current) {
      const isScrolledRight =
        Math.abs(
          tableContainerRef.current.scrollWidth -
            tableContainerRef.current.clientWidth -
            tableContainerRef.current.scrollLeft
        ) < 5;

      if (isScrolledRight) {
        fetchNextPage();
      }
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
        performance: user.performance,
        totalBookings: user.totalBookings,
      };
    });
  }, [flattenedUsers, flattenedStats, data?.pages]);

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
        <div className="overflow-x-auto" ref={tableContainerRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-subtle sticky left-0 z-10 w-[200px]">{t("user")}</TableHead>
                {flattenedStats.map((period, index) => {
                  const date = new Date(period.period_start);
                  const today = new Date();
                  let isCurrent = false;

                  if (selectedPeriod === "perDay") {
                    isCurrent =
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();
                  } else if (selectedPeriod === "perWeek") {
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    isCurrent = date >= weekStart && date <= weekEnd;
                  } else if (selectedPeriod === "perMonth") {
                    isCurrent =
                      date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                  }

                  return (
                    <TableHead
                      key={period.period_start.toString()}
                      className="text-center"
                      data-is-current={isCurrent}
                      ref={index === flattenedStats.length - 2 ? ref : undefined}>
                      <span className={classNames(isCurrent && "font-bold")}>
                        {date.toLocaleDateString()}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="bg-default sticky left-0 z-10">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm" imageSrc={row.avatarUrl} alt={row.name} />
                      <div className="flex flex-col">
                        <span>{row.name}</span>
                        <span
                          className={classNames("text-xs font-medium", getPerformanceColor(row.performance))}>
                          {getPerformanceLabel(row.performance, t)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  {flattenedStats.map((period) => (
                    <TableCell key={period.period_start.toString()} className="text-center">
                      {row.stats[period.period_start.toString()]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
