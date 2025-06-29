"use client";

import { FunnelChart, Tooltip, Funnel } from "recharts";

export type DropOffFunnelProps = {
  data: Array<{ value: number; name: string; fill: string }>;
};

export function DropOffFunnel({ data }: DropOffFunnelProps) {
  return (
    <FunnelChart width={300} height={300} reverseStackOrder={false}>
      <Tooltip />
      <Funnel dataKey="value" data={data} isAnimationActive>
        {/* <LabelList position="left" stroke="none" dataKey="name" /> */}
      </Funnel>
    </FunnelChart>
  );
}
