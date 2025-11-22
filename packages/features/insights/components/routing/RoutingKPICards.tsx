"use client";

import { useInsightsRoutingParameters } from "@calcom/features/insights/hooks/useInsightsRoutingParameters";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import classNames from "@calcom/ui/classNames";
import { SkeletonText } from "@calcom/ui/components/skeleton";

import { formatTimeToBook, valueFormatter } from "../../lib";
import { ChartCard } from "../ChartCard";

export const RoutingKPICards = () => {
  const { t } = useLocale();
  const insightsRoutingParameters = useInsightsRoutingParameters();

  const { data, isPending } = trpc.viewer.insights.routingFormsByStatus.useQuery(insightsRoutingParameters, {
    staleTime: 30000,
    trpc: {
      context: { skipBatch: true },
    },
  });

  const categories: {
    title: string;
    index: "total" | "totalWithoutBooking" | "totalWithBooking" | "totalReassigned" | "avgTimeToBook";
    formatter?: (value: number) => string;
  }[] = [
    {
      title: t("routing_forms_total_responses"),
      index: "total",
    },
    {
      title: t("routing_forms_total_responses_without_booking"),
      index: "totalWithoutBooking",
    },
    {
      title: t("routing_forms_total_responses_with_booking"),
      index: "totalWithBooking",
    },
    {
      title: t("routing_forms_reassigned_bookings"),
      index: "totalReassigned",
    },
    {
      title: t("routing_forms_avg_time_to_book"),
      index: "avgTimeToBook",
      formatter: formatTimeToBook,
    },
  ];

  const seatsCategories = data?.seatsData
    ? [
        {
          title: t("total_bookings"),
          value: data.seatsData.totalBookings,
        },
        {
          title: t("seats_bookings"),
          value: data.seatsData.totalSeatsBookings,
        },
        {
          title: t("fully_booked_events"),
          value: data.seatsData.fullyBookedEvents,
        },
      ]
    : [];

  if (isPending) {
    return <LoadingKPICards categories={categories} />;
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <ChartCard title={t("stats")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((item) => (
            <div
              key={item.title}
              className={classNames(
                "border-muted border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              )}>
              <div className="text-default text-sm">{item.title}</div>
              <div className="flex items-baseline justify-start space-x-3 truncate">
                <div className="text-emphasis text-2xl font-semibold">
                  {item.formatter ? item.formatter(data[item.index]) : valueFormatter(data[item.index])}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
      {seatsCategories.length > 0 && (
        <ChartCard title={t("seats_data")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {seatsCategories.map((item) => (
              <div
                key={item.title}
                className={classNames(
                  "border-muted border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                )}>
                <div className="text-default text-sm">{item.title}</div>
                <div className="flex items-baseline justify-start space-x-3 truncate">
                  <div className="text-emphasis text-2xl font-semibold">{valueFormatter(item.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </>
  );
};

const LoadingKPICards = (props: { categories: { title: string; index: string }[] }) => {
  const { t } = useLocale();
  const { categories } = props;
  return (
    <ChartCard title={t("stats")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {categories.map((item) => (
          <div
            key={item.title}
            className={classNames(
              "border-muted border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            )}>
            <div>
              <SkeletonText className="mt-1 h-5 w-32" />
            </div>
            <div>
              <SkeletonText className="h-6 w-12" />
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
};
