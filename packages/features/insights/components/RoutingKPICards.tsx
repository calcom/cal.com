import { Grid } from "@tremor/react";
import { Flex, Text, Metric } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { valueFormatter } from "../lib";
import { CardInsights } from "./Card";

export const RoutingKPICards = ({
  given,
}: {
  given?: { isAll: boolean; teamId: number | undefined; userId: number | undefined };
}) => {
  const { t } = useLocale();
  const { filter } = useFilterContext();

  const userId = given?.userId ?? filter.selectedUserId;
  const isAll = given?.isAll ?? filter.isAll;
  const teamId = given?.teamId ?? filter.selectedTeamId;

  const {
    dateRange,
    selectedEventTypeId,
    selectedMemberUserId,
    initialConfig,
    selectedRoutingFormId,
    selectedBookingStatus,
    selectedRoutingFormFilter,
  } = filter;
  const initialConfigIsReady =
    Boolean(given) || !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);
  const [startDate, endDate] = dateRange;

  const { data, isSuccess, isPending } = trpc.viewer.insights.routingFormsByStatus.useQuery(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamId,
      eventTypeId: selectedEventTypeId ?? undefined,
      isAll,
      routingFormId: selectedRoutingFormId ?? undefined,
      userId,
      memberUserId: selectedMemberUserId ?? undefined,
      bookingStatus: selectedBookingStatus ?? undefined,
      fieldFilter: selectedRoutingFormFilter ?? undefined,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
      enabled: initialConfigIsReady,
    }
  );

  const categories: {
    title: string;
    index: "active" | "total_responses" | "total_responses_without_booking" | "total_responses_with_booking";
  }[] = [
    {
      title: t("routing_forms_total_responses"),
      index: "total_responses",
    },
    {
      title: t("routing_forms_total_responses_without_booking"),
      index: "total_responses_without_booking",
    },
    {
      title: t("routing_forms_total_responses_with_booking"),
      index: "total_responses_with_booking",
    },
  ];

  if (isPending) {
    return <LoadingKPICards categories={categories} />;
  }

  if (!isSuccess || !startDate || !endDate || (!teamId && !userId)) return null;

  return (
    <>
      <Grid numColsSm={1} numColsLg={3} className="mt-4 gap-x-4 gap-y-4">
        {categories.map((item) => (
          <CardInsights key={item.title}>
            <Text className="text-default">{item.title}</Text>
            <Flex className="items-baseline justify-start space-x-3 truncate">
              {/* @ts-expect-error - theyre actually dynamic fields that we know the index of - but TS doesnt know that */}
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
