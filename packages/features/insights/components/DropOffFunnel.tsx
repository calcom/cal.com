"use client";

import { FunnelChart, Tooltip, Funnel, ResponsiveContainer, LabelList } from "recharts";

export type DropOffFunnelProps = {
  data?: Array<{
    value: number;
    name: string;
    label: string;
    rate: number;
    fill: string;
  }>;
};

export function DropOffFunnel({ data }: DropOffFunnelProps) {
  if (!data) {
    return (
      <div className="py-8 text-center text-gray-500">
        No routing form data available for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Funnel Chart */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Conversion Funnel</h2>
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
      </div>
    </div>
  );
}
