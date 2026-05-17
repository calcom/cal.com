"use client";

import { valueFormatter } from "@calcom/features/insights/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";
import { ChartCard } from "../ChartCard";

export const RoutingKPICards = () => {
  const { t } = useLocale();
  const insightsRoutingParameters = useInsightsRoutingParameters();

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.routingFormsByStatus.useQuery(
    insightsRoutingParameters,
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  const categories: {
    title: string;
    index: "total" | "totalWithoutBooking" | "totalWithBooking";
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
  ];

  if (isPending) {
    return <LoadingKPICards categories={categories} isPending={isPending} isError={isError} />;
  }

  return (
    <ChartCard title={t("stats")} isPending={isPending} isError={isError}>
      {isSuccess && data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {categories.map((item) => (
            <div
              key={item.title}
              className={classNames(
                "border-muted border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              )}>
              <div className="text-default text-sm">{item.title}</div>
              <div className="flex items-baseline justify-start space-x-3 truncate">
                <div className="text-emphasis text-2xl font-semibold">{valueFormatter(data[item.index])}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </ChartCard>
  );
};

const LoadingKPICards = (props: {
  categories: { title: string; index: string }[];
  isPending: boolean;
  isError: boolean;
}) => {
  const { t } = useLocale();
  const { categories, isPending, isError } = props;

  return (
    <ChartCard title={t("stats")} isPending={isPending} isError={isError}>
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
