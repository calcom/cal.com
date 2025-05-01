import { Grid } from "@tremor/react";
import { Flex, Text, Metric } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { valueFormatter } from "../lib";
import { CardInsights } from "./Card";

export const RoutingKPICards = () => {
  const { t } = useLocale();
  const { teamId, startDate, endDate, userId, memberUserIds, isAll, routingFormId, columnFilters } =
    useInsightsParameters();

  const { data, isPending } = trpc.viewer.insights.routingFormsByStatus.useQuery(
    {
      teamId,
      startDate,
      endDate,
      userId,
      memberUserIds,
      isAll,
      routingFormId,
      columnFilters,
    },
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
    return <LoadingKPICards categories={categories} />;
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <Grid numColsSm={1} numColsLg={3} className="mt-4 gap-x-4 gap-y-4">
        {categories.map((item) => (
          <CardInsights key={item.title}>
            <Text className="text-default">{item.title}</Text>
            <Flex className="items-baseline justify-start space-x-3 truncate">
              <Metric className="text-emphasis">{valueFormatter(data[item.index])}</Metric>
            </Flex>
          </CardInsights>
        ))}
      </Grid>
    </>
  );
};

const LoadingKPICards = (props: { categories: { title: string; index: string }[] }) => {
  const { categories } = props;
  return (
    <Grid numColsSm={2} numColsLg={4} className="mt-4 gap-x-4 gap-y-4">
      {categories.map((item) => (
        <CardInsights key={item.title}>
          <div className="animate-pulse">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-4 flex items-baseline space-x-3">
              <div className="h-8 w-16 rounded bg-gray-200" />
            </div>
          </div>
        </CardInsights>
      ))}
    </Grid>
  );
};
