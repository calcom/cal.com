import { ChartCard } from "@calcom/features/insights/components/ChartCard";
import { LineChart } from "@calcom/features/insights/components/LineChart";
import { LoadingInsight } from "@calcom/features/insights/components/LoadingInsights";
import { valueFormatter } from "@calcom/features/insights/lib/valueFormatter";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsWorkflowsParameters } from "../hooks/useInsightsWorkflowsParameters";

export const WorkflowStatusLineChart = () => {
  const { t } = useLocale();
  const insightsWorkflowsParams = useInsightsWorkflowsParameters();

  const {
    data: workflowsTimeline,
    isSuccess,
    isPending,
  } = trpc.viewer.insights.workflowsTimeline.useQuery(insightsWorkflowsParams, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  if (isPending) return <LoadingInsight />;

  if (!isSuccess) return null;

  return (
    <ChartCard title={t("workflow_trends")}>
      <LineChart
        className="linechart mt-4 h-80"
        data={workflowsTimeline}
        categories={["Sent", "Read", "Failed", "Queued", "Cancelled", "Total"]}
        index="formattedDate"
        colors={["purple", "green", "red", "blue", "gray", "orange"]}
        valueFormatter={valueFormatter}
      />
    </ChartCard>
  );
};
