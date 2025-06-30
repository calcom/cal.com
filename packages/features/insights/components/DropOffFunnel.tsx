"use client";

import { FunnelChart, Tooltip, Funnel, ResponsiveContainer, LabelList } from "recharts";

import { useInsightsParameters } from "@calcom/features/insights/hooks/useInsightsParameters";
import { trpc } from "@calcom/trpc";

export type DropOffFunnelProps = {
  data?: Array<{
    value: number;
    name: string;
    label: string;
    rate: number;
    fill: string;
  }>;
};

export function DropOffFunnelContent({ data }: DropOffFunnelProps) {
  if (!data) {
    return (
      <div className="py-8 text-center text-gray-500">
        No routing form data available for the selected period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <FunnelChart>
        <Tooltip
          formatter={(value: number, name: string, props: any) => [
            `${value} (${props.payload.rate?.toFixed(1)}%)`,
            props.payload.label || name,
          ]}
        />
        <Funnel dataKey="value" data={data} isAnimationActive>
          <LabelList dataKey="label" position="center" fill="#fff" fontSize={12} fontWeight="bold" />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

export function DropOffFunnel() {
  const { scope, selectedTeamId, startDate, endDate } = useInsightsParameters();
  const { data, isSuccess, isPending } = trpc.viewer.insights.getDropOffData.useQuery(
    {
      scope,
      selectedTeamId,
      startDate,
      endDate,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  // if (isPending) {
  //   return (
  //     <div className="rounded-lg bg-white p-6 shadow">
  //       <div className="animate-pulse">
  //         <div className="mb-4 h-4 w-1/4 rounded bg-gray-200" />
  //         <div className="h-64 rounded bg-gray-200" />
  //       </div>
  //     </div>
  //   );
  // }

  if (!isSuccess || !data) {
    return null;
  }

  return (
    <div className="w-full text-sm">
      <div className="flex h-12 items-center">
        <h2 className="text-emphasis text-md font-semibold">Drop-off</h2>
      </div>
      <div className="border-subtle w-full rounded-md border py-4">
        <DropOffFunnelContent data={data} />
      </div>
    </div>
  );
}
