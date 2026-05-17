"use client";

import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Input, ToggleGroup } from "@calcom/ui/components/form";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@calcom/ui/components/hover-card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableNew,
  TableRow,
} from "@calcom/ui/components/table";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";
import type { TFunction } from "i18next";
import { useQueryState } from "nuqs";
import posthog from "posthog-js";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { ChartCard } from "../ChartCard";

interface DownloadButtonProps {
  selectedPeriod: "perDay" | "perWeek" | "perMonth";
  searchQuery?: string;
}

function DownloadButton({ selectedPeriod, searchQuery }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const routingParams = useInsightsRoutingParameters();
  const utils = trpc.useContext();

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default form submission

    try {
      posthog.capture("insights_routing_download_clicked", { teamId: routingParams.selectedTeamId });
      const result = await utils.viewer.insights.routedToPerPeriodCsv.fetch({
        ...routingParams,
        period: selectedPeriod,
        searchQuery: searchQuery || undefined,
      });

      if (!result?.data) {
        throw new Error("No data received");
      }

      downloadAsCsv(result.data, result.filename || "routing-data.csv");
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      type="button" // Change from submit to button
      color="secondary"
      variant="icon"
      onClick={handleDownload}
      disabled={isDownloading}
      StartIcon={isDownloading ? "rotate-ccw" : "download"}
    />
  );
}

interface FormCardProps {
  selectedPeriod: "perDay" | "perWeek" | "perMonth";
  onPeriodChange: (value: "perDay" | "perWeek" | "perMonth") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  children: ReactNode;
}

function FormCard({ selectedPeriod, onPeriodChange, searchQuery, onSearchChange, children }: FormCardProps) {
  const { t } = useLocale();

  return (
    <div className="w-full rounded-md">
      <div className="flex flex-col">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <ToggleGroup
              options={[
                { label: t("per_day"), value: "perDay" },
                { label: t("per_week"), value: "perWeek" },
                { label: t("per_month"), value: "perMonth" },
              ]}
              className="w-fit"
              value={selectedPeriod}
              onValueChange={(value) => value && onPeriodChange(value as "perDay" | "perWeek" | "perMonth")}
            />
            <div className="flex items-center gap-2">
              <div className="max-w-64">
                <Input
                  type="text"
                  placeholder={t("search")}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full"
                />
              </div>
              <DownloadButton selectedPeriod={selectedPeriod} searchQuery={searchQuery} />
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

type RoutedToTableRow = RouterOutputs["viewer"]["insights"]["routedToPerPeriod"]["users"]["data"][number];

const getPerformanceBadge = (performance: RoutedToTableRow["performance"], t: TFunction) => {
  switch (performance) {
    case "above_average":
      return (
        <Tooltip content={t("above_average")}>
          <Badge variant="success" className="w-fit gap-1">
            {t("above_average")}
          </Badge>
        </Tooltip>
      );
    case "below_average":
      return (
        <Tooltip content={t("below_average")}>
          <Badge variant="red" className="w-fit gap-1">
            {t("below_average")}
          </Badge>
        </Tooltip>
      );
    case "median":
      return (
        <Tooltip content={t("median")}>
          <Badge variant="orange" className="w-fit gap-1">
            {t("median")}
          </Badge>
        </Tooltip>
      );
    case "at_average":
      return (
        <Tooltip content={t("at_average")}>
          <Badge variant="blue" className="w-fit gap-1">
            {t("at_average")}
          </Badge>
        </Tooltip>
      );
    default:
      return (
        <Tooltip content={t("no_data")}>
          <Badge variant="gray" className="w-fit gap-1">
            {t("no_data")}
          </Badge>
        </Tooltip>
      );
  }
};

export function RoutedToPerPeriod() {
  const { t } = useLocale();
  const routingParams = useInsightsRoutingParameters();
  const [selectedPeriod, setSelectedPeriod] = useState<"perDay" | "perWeek" | "perMonth">("perWeek");
  const [searchQuery, setSearchQuery] = useQueryState("search", {
    defaultValue: "",
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data, isLoading, isError } = trpc.viewer.insights.routedToPerPeriod.useQuery(
    {
      ...routingParams,
      period: selectedPeriod,
      searchQuery: debouncedSearchQuery || undefined,
    },
    {
      staleTime: 30000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  const flattenedUsers = useMemo(() => {
    return data?.users.data || [];
  }, [data?.users.data]);

  const uniquePeriods = useMemo(() => {
    if (!data?.periodStats.data) return [];

    // Get all unique periods
    const periods = new Set<string>();
    data.periodStats.data.forEach((stat) => {
      periods.add(stat.period_start.toISOString());
    });

    return Array.from(periods)
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [data?.periodStats.data]);

  const processedData = useMemo(() => {
    if (!data?.periodStats.data) return [];

    // Create a map for quick lookup of stats
    const statsMap = new Map<string, number>();
    data.periodStats.data.forEach((stat) => {
      const key = `${stat.userId}-${stat.period_start.toISOString()}`;
      statsMap.set(key, stat.total);
    });

    return flattenedUsers.map((user) => {
      const stats = uniquePeriods.reduce(
        (acc, period) => {
          const key = `${user.id}-${period.toISOString()}`;
          acc[period.toISOString()] = statsMap.get(key) ?? 0;
          return acc;
        },
        {} as { [key: string]: number }
      );

      return {
        id: user.id,
        name: user.name || "",
        avatarUrl: user.avatarUrl,
        stats,
        performance: user.performance,
        totalBookings: user.totalBookings,
      };
    });
  }, [data?.periodStats.data, flattenedUsers, uniquePeriods]);

  const isCurrentPeriod = (date: Date, today: Date, selectedPeriod: string): boolean => {
    if (selectedPeriod === "perDay") {
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    } else if (selectedPeriod === "perWeek") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return date >= weekStart && date <= weekEnd;
    } else if (selectedPeriod === "perMonth") {
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }
    return false;
  };

  return (
    <ChartCard title={t("routed_to_per_period")} isPending={isLoading} isError={isError}>
      <div className="w-full text-sm">
        <FormCard
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}>
          <div className="mt-6">
            <div
              className="scrollbar-thin border-subtle relative overflow-auto rounded-md border"
              ref={tableContainerRef}>
              <TableNew className="border-0">
                <TableHeader className="bg-subtle sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="bg-subtle sticky left-0 z-30 w-[200px]">{t("user")}</TableHead>
                    {uniquePeriods.map((period) => {
                      const date = period;
                      const today = new Date();

                      const isCurrent = isCurrentPeriod(date, today, selectedPeriod);

                      return (
                        <TableHead
                          key={period.toISOString()}
                          className="text-center"
                          data-is-current={isCurrent}>
                          <span className={classNames(isCurrent && "font-bold")}>
                            {date.toLocaleDateString()}
                          </span>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody className="relative">
                  {processedData.map((row) => {
                    return (
                      <TableRow key={row.id} className="divide-muted divide-x">
                        <TableCell className="w-[200px]">
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <div className="flex cursor-pointer items-center gap-2">
                                <Avatar size="sm" imageSrc={row.avatarUrl} alt={row.name || ""} />
                                <div className="flex flex-col gap-1 truncate">
                                  <span>{row.name}</span>
                                </div>
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="p-3">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-default font-medium">{row.name}</span>
                                </div>
                                <div className="text-subtle flex flex-col text-sm">
                                  <div>
                                    {t("total_bookings_per_period")}: <Badge>{row.totalBookings}</Badge>
                                    {t("status")}: {getPerformanceBadge(row.performance, t)}
                                  </div>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </TableCell>
                        {uniquePeriods.map((period) => {
                          return (
                            <TableCell key={period.toISOString()} className="text-center">
                              {row.stats[period.toISOString()] === 0 ? null : (
                                <>{row.stats[period.toISOString()]}</>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </TableNew>
            </div>
          </div>
        </FormCard>
      </div>
    </ChartCard>
  );
}
