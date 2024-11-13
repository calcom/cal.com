import { Grid } from "@tremor/react";
import { Flex, Text, Metric } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { SkeletonContainer, SkeletonText } from "@calcom/ui";

import { useFilterContext } from "../context/provider";
import { valueFormatter } from "../lib";
import { CardInsights } from "./Card";

export const RoutingKPICards = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();

  const {
    dateRange,
    selectedEventTypeId,
    selectedUserId,
    selectedMemberUserId,
    isAll,
    initialConfig,
    selectedRoutingFormId,
    selectedBookingStatus,
    selectedRoutingFormFilter,
  } = filter;
  const initialConfigIsReady = !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);
  const [startDate, endDate] = dateRange;

  const { selectedTeamId: teamId } = filter;

  const { data, isSuccess, isPending } = trpc.viewer.insights.routingFormsByStatus.useQuery(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamId,
      eventTypeId: selectedEventTypeId ?? undefined,
      isAll,
      routingFormId: selectedRoutingFormId ?? undefined,
      userId: selectedMemberUserId ?? undefined,
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
    index:
      | "created"
      | "active"
      | "total_responses"
      | "total_responses_without_booking"
      | "total_responses_with_booking";
  }[] = [
    {
      title: t("routing_forms_created"),
      index: "created",
    },
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

  if (!isSuccess || !startDate || !endDate || (!teamId && !selectedUserId)) return null;

  return (
    <>
      <Grid numColsSm={2} numColsLg={4} className="gap-x-4 gap-y-4">
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
    <Grid numColsSm={2} numColsLg={4} className="gap-x-4 gap-y-4">
      {categories.map((item) => (
        <CardInsights key={item.title}>
          <SkeletonContainer className="flex w-full flex-col">
            <SkeletonText className="mt-2 h-4 w-32" />
            <SkeletonText className="mt-2 h-6 w-16" />
            <SkeletonText className="mt-4 h-6 w-44" />
          </SkeletonContainer>
        </CardInsights>
      ))}
    </Grid>
  );
};
