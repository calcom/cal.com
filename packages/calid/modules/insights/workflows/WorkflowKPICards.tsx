import { Grid } from "@tremor/react";
import { Flex, Text, Metric } from "@tremor/react";

import { CardInsights } from "@calcom/features/insights/components/Card";
import { useInsightsOrgTeams } from "@calcom/features/insights/hooks/useInsightsOrgTeams";
import { valueFormatter } from "@calcom/features/insights/lib/valueFormatter";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsWorkflowsParameters } from "../hooks/useInsightsWorkflowsParameters";

export const WorkflowKPICards = () => {
  const { t } = useLocale();
  const { userId } = useInsightsOrgTeams();
  const insightsWorkflowParams = {
    ...useInsightsWorkflowsParameters(),
    memberUserId: userId,
  };

  const { data, isSuccess, isPending } = trpc.viewer.insights.workflowsByStatus.useQuery(
    insightsWorkflowParams,
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  const categories: {
    title: string;
    index: "total" | "sentCount" | "readCount" | "failedCount";
  }[] = [
    {
      title: t("workflows_triggered"),
      index: "total",
    },
    {
      title: t("workflows_sent"),
      index: "sentCount",
    },
    {
      title: t("workflows_read"),
      index: "readCount",
    },
    {
      title: t("workflows_failed"),
      index: "failedCount",
    },
  ];

  if (isPending) {
    return <LoadingKPICards categories={categories} />;
  }

  if (!data || !isSuccess) return null;
  return (
    <>
      <Grid numColsSm={1} numColsLg={4} className="mt-4 gap-x-4 gap-y-4">
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
